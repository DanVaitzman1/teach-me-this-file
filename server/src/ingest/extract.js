import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { getDocumentProxy, getResolvedPDFJS } from 'unpdf';
import { transcribe } from '../ai/transcribe.js';
import { AppError } from '../errors.js';
import { log } from '../logger.js';
import { docxToText } from './docxToText.js';
import { transcribePdf } from './transcribePdf.js';
import { needsVisualReading } from './pdfPage.js';
import { MAX_PDF_PAGES } from '../../../shared/documentLimits.mjs';

// Supported file types, decided by extension because browsers report
// MIME types inconsistently (e.g. .md is often empty).
const FILE_TYPES = {
  '.pdf': { kind: 'pdf', mimeType: 'application/pdf' },
  '.docx': { kind: 'docx' },
  '.txt': { kind: 'text' },
  '.md': { kind: 'text' },
  '.png': { kind: 'image', mimeType: 'image/png' },
  '.jpg': { kind: 'image', mimeType: 'image/jpeg' },
  '.jpeg': { kind: 'image', mimeType: 'image/jpeg' },
  '.webp': { kind: 'image', mimeType: 'image/webp' },
};

// PDFs up to this length always go to Gemini: a PDF text layer drops formulas
// drawn as images, flattens exponents (2³ becomes "23") and scrambles Hebrew
// word order and spacing. Longer PDFs use the text layer to save time and quota.
const MAX_AI_PDF_PAGES = 20;

const unreadable = (what) =>
  new AppError(422, 'UNREADABLE_FILE', `This ${what} could not be opened. It may be damaged or password-protected.`);

// Returns the document as pages of plain text: { pages: [{ page, text }], method, truncated }.
// `page` is null for formats without pages (DOCX, plain text).
// `method` is text, ai or hybrid. Accepted PDFs include every original page.
// The legacy truncated flag remains false for newly uploaded documents.
export async function extractPages({ buffer, fileName, apiKey, signal }) {
  const type = FILE_TYPES[path.extname(fileName).toLowerCase()];
  if (!type) {
    throw new AppError(415, 'UNSUPPORTED_FILE', 'Supported files: PDF, DOCX, TXT, MD, PNG, JPG, WEBP.');
  }

  switch (type.kind) {
    case 'pdf':
      return extractPdf({ buffer, apiKey, signal });
    case 'docx':
      return extractDocx({ buffer, apiKey, signal });
    case 'text':
      return { pages: [{ page: null, text: decodeText(buffer) }], method: 'text', truncated: false };
    case 'image':
      if (!isImage(buffer, type.mimeType)) throw unreadable('image');
      return { pages: await transcribe({ apiKey, buffer, mimeType: type.mimeType, signal }), method: 'ai', truncated: false };
  }
}

function isImage(buffer, mimeType) {
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/jpeg') return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

async function extractPdf({ buffer, apiKey, signal }) {
  let pdf;
  try {
    pdf = await PDFDocument.load(buffer);
  } catch {
    throw unreadable('PDF');
  }
  const pageCount = pdf.getPageCount();
  if (pageCount > MAX_PDF_PAGES) {
    throw new AppError(413, 'TOO_MANY_PAGES', `PDFs up to ${MAX_PDF_PAGES} pages are supported. Split the document into chapters.`);
  }

  // The text layer is read in every case: for a long digital PDF it is the
  // content, and for a transcribed one it helps Gemini get digits and words
  // right. A PDF whose text layer can't be read still works, without that help.
  const layer = await readTextLayer(buffer, signal);
  const pageTexts = layer?.map(({ text }) => text) ?? null;
  const visualPages = Array.from({ length: pageCount }, (_, i) => i)
    .filter((i) => pageCount <= MAX_AI_PDF_PAGES || !layer || layer[i].visual);
  const method = visualPages.length === 0 ? 'text' : visualPages.length === pageCount ? 'ai' : 'hybrid';
  log.info('pdf_route', { pages: pageCount, via: method, visualPages: visualPages.length });

  const transcribed = visualPages.length
    ? await transcribePdf({ pdf, pageIndices: visualPages, pageTexts, apiKey, signal }) : [];
  const byPage = new Map(transcribed.map((page) => [page.page, page]));
  const pages = Array.from({ length: pageCount }, (_, i) => byPage.get(i + 1) ?? { page: i + 1, text: pageTexts?.[i] ?? '' });
  return { pages, method, truncated: false, pageCount, visualPageCount: visualPages.length };
}

async function readTextLayer(buffer, signal) {
  let pdf;
  try {
    // pdf.js takes ownership of the array it gets, so give it a copy.
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { OPS } = await getResolvedPDFJS();
    const graphics = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject,
      OPS.paintImageXObjectRepeat, OPS.paintImageMaskXObjectRepeat, OPS.constructPath, OPS.shadingFill]);
    const pages = [];
    // Sequential inspection bounds parser memory on large PDFs.
    for (let i = 1; i <= pdf.numPages; i++) {
      signal?.throwIfAborted();
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items.filter((item) => item.str != null);
      const text = items.map((item) => item.str + (item.hasEOL ? '\n' : '')).join('');
      const operators = await page.getOperatorList();
      const hasGraphics = operators.fnArray.some((op) => graphics.has(op));
      pages.push({ text, visual: needsVisualReading({ text, items, hasGraphics }) });
      page.cleanup();
    }
    return pages;
  } catch {
    signal?.throwIfAborted();
    log.warn('pdf_text_layer_unreadable');
    return null;
  } finally {
    await pdf?.loadingTask.destroy();
  }
}

async function extractDocx({ buffer, apiKey, signal }) {
  try {
    const { text, images } = await docxToText(buffer, { apiKey, signal });
    return { pages: [{ page: null, text }], method: images ? 'hybrid' : 'text', truncated: false };
  } catch (err) {
    if (err instanceof AppError || signal?.aborted) throw err;
    throw unreadable('Word document');
  }
}

function decodeText(buffer) {
  const encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? 'utf-16le'
    : buffer[0] === 0xfe && buffer[1] === 0xff ? 'utf-16be' : 'utf-8';
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(buffer);
    if (text.includes('\0')) throw unreadable('text file');
    return text;
  } catch {
    throw new AppError(422, 'TEXT_ENCODING', 'Save the text as UTF-8 or UTF-16, or upload a PDF.');
  }
}
