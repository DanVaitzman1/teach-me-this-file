import { PDFDocument } from 'pdf-lib';
import { transcribe } from '../ai/transcribe.js';
import { log } from '../logger.js';

// One Gemini request writes its output token by token, so a long PDF in a
// single request takes minutes. Small chunks sent in parallel finish much sooner.
const PAGES_PER_CHUNK = 5;

// Kept low to stay under free-tier requests-per-minute limits.
const MAX_PARALLEL = 4;

// Transcribes the first `pageCount` pages of a pdf-lib PDFDocument.
// pageTexts: the PDF's text layer per page (or null), passed along as a hint.
// → [{ page, text }] numbered across the whole document.
export async function transcribePdf({ pdf, pageCount, pageTexts, apiKey, signal }) {
  const chunks = await splitPdf(pdf, pageCount);
  log.info('pdf_split', { pages: pageCount, chunks: chunks.length, parallel: Math.min(MAX_PARALLEL, chunks.length) });

  // If one chunk fails the upload fails, so cancel the others instead of paying for them.
  const failed = new AbortController();
  const chunkSignal = AbortSignal.any([signal, failed.signal]);

  try {
    const results = await mapWithLimit(chunks, MAX_PARALLEL, async ({ firstPage, lastPage, bytes }, index) => {
      const pages = await transcribe({
        apiKey,
        buffer: Buffer.from(bytes),
        mimeType: 'application/pdf',
        signal: chunkSignal,
        textLayer: textLayerFor(pageTexts, firstPage, lastPage),
        label: `chunk ${index + 1}/${chunks.length} (pages ${firstPage}-${lastPage})`,
      });
      // Gemini numbers pages within the chunk, starting at 1.
      return pages.map(({ page, text }) => ({ page: firstPage + page - 1, text }));
    });
    return results.flat();
  } catch (err) {
    failed.abort();
    throw err;
  }
}

async function splitPdf(pdf, pageCount) {
  const chunks = [];
  for (let start = 0; start < pageCount; start += PAGES_PER_CHUNK) {
    const chunk = await PDFDocument.create();
    const indices = [];
    const end = Math.min(start + PAGES_PER_CHUNK, pageCount);
    for (let i = start; i < end; i++) indices.push(i);
    const pages = await chunk.copyPages(pdf, indices);
    pages.forEach((page) => chunk.addPage(page));
    chunks.push({ firstPage: start + 1, lastPage: end, bytes: await chunk.save() });
  }
  return chunks;
}

// The chunk's pages of the text layer, numbered like the chunk (from 1), or
// null when there is no usable text (scanned pages, unreadable text layer).
function textLayerFor(pageTexts, firstPage, lastPage) {
  const pages = pageTexts?.slice(firstPage - 1, lastPage) ?? [];
  if (pages.every((text) => !text.trim())) return null;
  return pages.map((text, i) => `=== PAGE ${i + 1} ===\n${text.trim()}`).join('\n\n');
}

// Like Promise.all(items.map(fn)), but runs at most `limit` calls at a time.
// fn gets (item, index).
async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
