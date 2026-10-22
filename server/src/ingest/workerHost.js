import { Worker } from 'node:worker_threads';
import { generateContent, toAppError } from '../ai/gemini.js';
import { AppError } from '../errors.js';
import { log } from '../logger.js';

// V8 heap limits isolate parser expansion and CPU work from chat/health requests.
// File buffers are additional memory, bounded by the upload cap and one slot.
const WORKER_LIMITS = { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16 };
const MAX_READ_MS = 10 * 60_000;

export function extractDocument({ buffer, fileName, apiKey, signal, requestId }) {
  signal?.throwIfAborted();
  const bytes = Uint8Array.from(buffer);
  const worker = new Worker(new URL('./extractWorker.js', import.meta.url), {
    workerData: { bytes, fileName, requestId }, transferList: [bytes.buffer], resourceLimits: WORKER_LIMITS,
  });
  const providerCalls = new Map();
  const stopped = new AbortController();
  let settled = false;

  return new Promise((resolve, reject) => {
    async function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      stopped.abort();
      await worker.terminate();
      if (error) reject(error); else resolve(result);
    }
    const onAbort = () => finish(signal.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => finish(new AppError(408, 'READ_TIMEOUT', 'Reading took too long. Upload a smaller chapter and retry.')), MAX_READ_MS);
    worker.on('error', (err) => {
      log.warn('document_worker_failed', { code: err.code });
      finish(new AppError(422, 'DOCUMENT_COMPLEX', 'This file needs too much memory to read safely. Export a smaller chapter as PDF.'));
    });
    worker.on('exit', () => {
      if (!settled) finish(new AppError(422, 'DOCUMENT_COMPLEX', 'The file reader stopped. Export a smaller chapter as PDF.'));
    });
    worker.on('message', async (message) => {
      if (settled) return;
      if (message.type === 'result') return finish(null, message.result);
      if (message.type === 'error') return finish(new AppError(message.error.status, message.error.code, message.error.message));
      if (message.type === 'ai_cancel') return providerCalls.get(message.id)?.abort();
      if (message.type !== 'ai') return;

      const controller = new AbortController();
      providerCalls.set(message.id, controller);
      try {
        const response = await generateContent(apiKey, message.models, {
          ...message.request,
          config: { ...message.request.config, abortSignal: AbortSignal.any([stopped.signal, controller.signal]) },
        }, message.label);
        if (!settled) worker.postMessage({ type: 'ai_result', id: message.id,
          response: { text: response.text, candidates: response.candidates } });
      } catch (err) {
        if (settled || controller.signal.aborted) return;
        const error = toAppError(err);
        if (!settled) worker.postMessage({ type: 'ai_result', id: message.id,
          error: { status: error.status, code: error.code, message: error.message } });
      } finally {
        providerCalls.delete(message.id);
      }
    });
  });
}
