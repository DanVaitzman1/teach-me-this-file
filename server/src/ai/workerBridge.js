import { isMainThread, parentPort } from 'node:worker_threads';
import { AppError } from '../errors.js';

export { isMainThread };
let nextId = 0;
const pending = new Map();

// Parsing runs in a bounded worker, but provider calls stay on the API thread:
// the key never needs to enter the worker or its messages.
if (!isMainThread) {
  parentPort.on('message', (message) => {
    if (message.type !== 'ai_result') return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    request.cleanup();
    if (message.error) {
      request.reject(new AppError(message.error.status, message.error.code, message.error.message));
    } else request.resolve(message.response);
  });
}

export function generateOnParent(models, request, label) {
  const id = ++nextId;
  const { abortSignal, ...config } = request.config ?? {};
  abortSignal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      pending.delete(id);
      parentPort.postMessage({ type: 'ai_cancel', id });
      reject(abortSignal.reason);
    };
    pending.set(id, { resolve, reject, cleanup: () => abortSignal?.removeEventListener('abort', abort) });
    abortSignal?.addEventListener('abort', abort, { once: true });
    parentPort.postMessage({ type: 'ai', id, models, request: { ...request, config }, label });
  });
}
