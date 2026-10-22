import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { extractText, getDocumentProxy } from 'unpdf';
import { transcribe } from '../ai/transcribe.js';
import { AppError } from '../errors.js';
import { log } from '../logger.js';
import { docxToText } from './docxToText.js';
import { transcribePdf } from './transcribePdf.js';

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

// Below this average, a longer PDF is treated as scanned and sent to Gemini anyway.
const MIN_CHARS_PER_PAGE = 100;

// A scanned PDF is transcribed up to this many pages; more would take many
// minutes and requests. The rest is reported as truncated.
const MAX_TRANSCRIBED_PAGES = 40;

const unreadable = (what) =>
  new AppError(422, 'UNREADABLE_FILE', `This ${what} could not be opened. It may be damaged or password-protected.`);

// Returns the document as pages of plain text: { pages: [{ page, text }], method, truncated }.
// `page` is null for formats without pages (DOCX, plain text).
// `method` is 'text' when we read the text layer and 'ai' when Gemini transcribed it.
// `truncated` is true when only the first pages of a long scanned PDF were read.
export async function extractPages({ buffer, fileName, apiKey, signal }) {
  const type = FILE_TYPES[path.extname(fileName).toLowerCase()];
  if (!type) {
    throw new AppError(415, 'UNSUPPORTED_FILE', 'Supported files: PDF, DOCX, TXT, MD, PNG, JPG, WEBP.');
  }

  switch (type.kind) {
    case 'pdf':
      return extractPdf({ buffer, apiKey, signal });
    case 'docx':
      return { pages: [{ page: null, text: await extractDocx(buffer) }], method: 'text', truncated: false };
    case 'text':
      return { pages: [{ page: null, text: buffer.toString('utf8').replace(/^﻿/, '') }], method: 'text', truncated: false };
    case 'image':
      return { pages: await transcribe({ apiKey, buffer, mimeType: type.mimeType, signal }), method: 'ai', truncated: false };
  }
}

async function extractPdf({ buffer, apiKey, signal }) {
  let pdf;
  try {
    pdf = await PDFDocument.load(buffer);
  } catch {
    throw unreadable('PDF');
  }
  const pageCount = pdf.getPageCount();

  // The text layer is read in every case: for a long digital PDF it is the
  // content, and for a transcribed one it helps Gemini get digits and words
  // right. A PDF whose text layer can't be read still works, without that help.
  const pageTexts = await readTextLayer(buffer);
  const charsPerPage = pageTexts
    ? Math.round(pageTexts.reduce((sum, text) => sum + text.trim().length, 0) / pageCount)
    : 0;

  if (pageCount > MAX_AI_PDF_PAGES && charsPerPage >= MIN_CHARS_PER_PAGE) {
    log.info('pdf_route', { pages: pageCount, via: 'text', charsPerPage });
    return { pages: pageTexts.map((text, i) => ({ page: i + 1, text })), method: 'text', truncated: false };
  }

  const reason = pageCount <= MAX_AI_PDF_PAGES ? `≤${MAX_AI_PDF_PAGES} pages` : `looks scanned (${charsPerPage} chars/page)`;
  const pagesToRead = Math.min(pageCount, MAX_TRANSCRIBED_PAGES);
  log.info('pdf_route', { pages: pageCount, via: 'ai', reason, transcribed: pagesToRead });
  const pages = await transcribePdf({ pdf, pageCount: pagesToRead, pageTexts, apiKey, signal });
  return { pages, method: 'ai', truncated: pagesToRead < pageCount };
}

async function readTextLayer(buffer) {
  try {
    // pdf.js takes ownership of the array it gets, so give it a copy.
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  } catch {
    log.warn('pdf_text_layer_unreadable');
    return null;
  }
}

async function extractDocx(buffer) {
  try {
    return await docxToText(buffer);
  } catch {
    throw unreadable('Word document');
  }
}
