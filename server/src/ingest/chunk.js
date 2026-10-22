import { MAX_DOCUMENT_CHARS, MAX_PASSAGE_CHARS, MAX_PASSAGES } from '../../../shared/documentLimits.mjs';
import { AppError } from '../errors.js';

// pages: [{ page, text }] → { passages: [{ id, page, text }], truncated }
export function toPassages(pages) {
  const passages = [];
  let totalChars = 0;

  for (const { page, text } of pages) {
    for (const chunk of chunkText(text)) {
      if (totalChars + chunk.length > MAX_DOCUMENT_CHARS || passages.length >= MAX_PASSAGES) {
        throw new AppError(413, 'DOCUMENT_TOO_LONG', 'This document exceeds 500,000 characters. Split it into chapters and upload one at a time.');
      }
      passages.push({ id: `p${passages.length + 1}`, page, text: chunk });
      totalChars += chunk.length;
    }
  }
  return { passages, truncated: false };
}

// Splits on blank lines and packs paragraphs together up to the size limit.
function chunkText(text) {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return pack(paragraphs.flatMap(splitLongParagraph), '\n\n');
}

// A paragraph over the limit is split at line breaks first, so a Markdown
// table is cut between rows; a line over the limit at sentence ends; and a
// sentence over the limit is cut at the limit. Each later piece of a table
// repeats the header rows, so it still renders (and reads) as a table.
function splitLongParagraph(paragraph) {
  if (paragraph.length <= MAX_PASSAGE_CHARS) return [paragraph];
  const lines = paragraph.split('\n');
  const isTable = lines.length > 2 && lines[0].trim().startsWith('|') && /^[\s|:-]+$/.test(lines[1]);
  if (!isTable) return pack(lines.flatMap(splitLongLine), '\n');
  const header = `${lines[0]}\n${lines[1]}`;
  const available = MAX_PASSAGE_CHARS - header.length - 1;
  // Very wide tables still retain their text; a header cannot consume a whole passage.
  if (available < 100 || lines.slice(2).some((line) => line.length > available)) {
    return pack(lines.flatMap(splitLongLine), '\n');
  }
  return pack(lines.slice(2), '\n', available).map((piece) => `${header}\n${piece}`);
}

function splitLongLine(line) {
  if (line.length <= MAX_PASSAGE_CHARS) return [line];
  const sentences = line.split(/(?<=[.!?。؟])\s+/);
  return pack(sentences.flatMap(cutToLimit), ' ');
}

function cutToLimit(text) {
  if (text.length <= MAX_PASSAGE_CHARS) return [text];
  return text.match(new RegExp(`[\\s\\S]{1,${MAX_PASSAGE_CHARS}}`, 'g'));
}

// Greedily joins consecutive pieces while they fit in one passage.
function pack(pieces, separator, limit = MAX_PASSAGE_CHARS) {
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + separator.length + piece.length > limit) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? current + separator + piece : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
