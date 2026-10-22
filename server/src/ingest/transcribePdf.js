import { PDFDocument } from 'pdf-lib';
import { transcribe } from '../ai/transcribe.js';
import { AppError } from '../errors.js';
import { log } from '../logger.js';

const PAGES_PER_CHUNK = 5;
const MAX_PARALLEL = 2;

// Only selected pages are copied. Each worker creates its next chunk on demand,
// rather than retaining copies of every page while the AI is reading the first.
export async function transcribePdf({ pdf, pageIndices, pageTexts, apiKey, signal }) {
  const chunks = [];
  for (let i = 0; i < pageIndices.length; i += PAGES_PER_CHUNK) chunks.push(pageIndices.slice(i, i + PAGES_PER_CHUNK));
  log.info('pdf_split', { pages: pageIndices.length, chunks: chunks.length, parallel: Math.min(MAX_PARALLEL, chunks.length) });
  const failed = new AbortController();
  const chunkSignal = AbortSignal.any([failed.signal, ...(signal ? [signal] : [])]);
  let next = 0;
  const results = new Array(chunks.length);

  async function read(indices, label) {
    chunkSignal.throwIfAborted();
    const chunk = await PDFDocument.create();
    const copied = await chunk.copyPages(pdf, indices);
    copied.forEach((page) => chunk.addPage(page));
    const bytes = await chunk.save();
    const hint = indices.map((index, i) => `=== PAGE ${i + 1} ===\n${pageTexts?.[index] ?? ''}`).join('\n\n');
    return transcribe({ apiKey, buffer: Buffer.from(bytes), mimeType: 'application/pdf', signal: chunkSignal, textLayer: hint, label });
  }

  async function worker() {
    while (next < chunks.length) {
      chunkSignal.throwIfAborted();
      const index = next++;
      const indices = chunks[index];
      const pages = await read(indices, `chunk ${index + 1}/${chunks.length}`);
      const byPage = new Map();
      for (const page of pages) {
        if (!Number.isInteger(page.page) || page.page < 1 || page.page > indices.length || byPage.has(page.page)) {
          throw new AppError(502, 'TRANSCRIPTION_INVALID', 'The AI returned inconsistent page numbers. Please retry.');
        }
        byPage.set(page.page, page.text);
      }
      // A missing page marker must never silently erase a page. Retry it alone;
      // blank pages are valid, and still return an empty entry numbered 1.
      for (let i = 0; i < indices.length; i++) {
        if (byPage.has(i + 1)) continue;
        const retry = await read([indices[i]], `missing page ${indices[i] + 1}`);
        if (retry.length !== 1 || retry[0].page !== 1) {
          throw new AppError(502, 'TRANSCRIPTION_INVALID', 'The AI omitted a page. Please retry.');
        }
        byPage.set(i + 1, retry[0].text);
      }
      results[index] = indices.map((original, i) => ({ page: original + 1, text: byPage.get(i + 1) }));
    }
  }

  // Abort immediately on the first failure, and wait for sibling workers to
  // release their buffers before releasing the upload's processing slot.
  let firstError;
  const workers = Array.from({ length: Math.min(MAX_PARALLEL, chunks.length) }, () => worker().catch((err) => {
    firstError ??= err;
    failed.abort();
    throw err;
  }));
  await Promise.allSettled(workers);
  if (firstError) throw firstError;
  return results.flat();
}
