// Passages are the unit the tutor cites as its source, so they should be
// small enough to show next to a chat message.
const MAX_PASSAGE_CHARS = 1200;

// Caps what we send to the AI (cost, latency, free-tier limits).
// Anything beyond it is dropped and reported as `truncated`.
const MAX_DOCUMENT_CHARS = 200_000;

// pages: [{ page, text }] → { passages: [{ id, page, text }], truncated }
export function toPassages(pages) {
  const passages = [];
  let totalChars = 0;

  for (const { page, text } of pages) {
    for (const chunk of chunkText(text)) {
      if (totalChars + chunk.length > MAX_DOCUMENT_CHARS) {
        return { passages, truncated: true };
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
  const pieces = pack(lines.flatMap(splitLongLine), '\n');

  const isTable = lines.length > 2 && lines[0].trim().startsWith('|') && /^[\s|:-]+$/.test(lines[1]);
  if (!isTable) return pieces;
  const header = `${lines[0]}\n${lines[1]}`;
  return pieces.map((piece, index) => (index === 0 ? piece : `${header}\n${piece}`));
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
function pack(pieces, separator) {
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + separator.length + piece.length > MAX_PASSAGE_CHARS) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? current + separator + piece : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
