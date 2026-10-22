import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { extractText, getDocumentProxy } from 'unpdf';
import JSZip from 'jszip';
import { extractPages } from './extract.js';
import { toPassages } from './chunk.js';
import { htmlToMarkdown, docxToText } from './docxToText.js';
import { needsVisualReading } from './pdfPage.js';

const file = (name) => readFile(new URL(`../../../test-files/${name}`, import.meta.url));
const extract = (buffer, fileName) => extractPages({ buffer, fileName, apiKey: 'test-key', signal: new AbortController().signal });
function aiResponse(text, finishReason = 'STOP') {
  return new Response(JSON.stringify({ candidates: [{ finishReason, content: { role: 'model', parts: [{ text }] } }] }), { headers: { 'Content-Type': 'application/json' } });
}

async function pdfWithPages(count, sparse = false) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i++) {
    const page = pdf.addPage();
    page.drawText(`PAGE-${i + 1}\n${sparse ? '' : 'Plants use sunlight, water and carbon dioxide to grow. '.repeat(6)}`, { x: 40, y: 700, size: 11, maxWidth: 500 });
  }
  return pdf;
}

function stubPdfAI(t, { omitMarkers = false } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const request = JSON.parse(options.body);
    const inline = request.contents[0].parts[0].inlineData;
    const doc = await getDocumentProxy(new Uint8Array(Buffer.from(inline.data, 'base64')));
    try {
      const { text } = await extractText(doc, { mergePages: false });
      calls.push(text);
      return aiResponse(text.map((value, i) => `${omitMarkers && i > 0 ? '' : `=== PAGE ${i + 1} ===\n`}${value || '[A diagram showing evaporation and rain.]'}`).slice(0, omitMarkers ? 1 : undefined).join('\n\n'));
    } finally { await doc.loadingTask.destroy(); }
  });
  return calls;
}

test('UTF-8 Arabic, UTF-16 Hebrew and BOMs preserve their original text', async () => {
  const arabic = 'دورة الماء: التبخر والتكاثف والهطول.';
  assert.equal((await extract(Buffer.from(`\ufeff${arabic}`), 'عربي.TXT')).pages[0].text, arabic);
  const hebrew = 'מים מתאדים מהים';
  assert.equal((await extract(Buffer.from(`\ufeff${hebrew}`, 'utf16le'), 'עברית.md')).pages[0].text, hebrew);
  await assert.rejects(extract(Buffer.from([0xff, 0x9a, 0x80]), 'broken.txt'), { code: 'TEXT_ENCODING' });
  await assert.rejects(extract(Buffer.from('abc\0def'), 'binary.txt'), { code: 'TEXT_ENCODING' });
});

test('unsupported, damaged and over-200-page PDFs fail before any AI call', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected AI call'); });
  await assert.rejects(extract(Buffer.from('data'), 'file.exe'), { code: 'UNSUPPORTED_FILE' });
  await assert.rejects(extract(Buffer.from('broken'), 'file.pdf'), { code: 'UNREADABLE_FILE' });
  await assert.rejects(extract(Buffer.from('broken'), 'file.png'), { code: 'UNREADABLE_FILE' });
  await assert.rejects(extract(Buffer.from('broken'), 'file.docx'), { code: 'UNREADABLE_FILE' });
  const pdf = await pdfWithPages(201, true);
  await assert.rejects(extract(Buffer.from(await pdf.save()), 'too-long.pdf'), { code: 'TOO_MANY_PAGES' });
});

test('all 71 pages of a long digital fixture survive extraction and passage creation', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Prose should not require AI'); });
  const result = await extract(await file('long-history-71-pages.pdf'), 'history.pdf');
  assert.equal(result.method, 'text');
  assert.equal(result.pages.length, 71);
  const { passages, truncated } = toPassages(result.pages);
  assert.equal(truncated, false);
  assert.equal(passages.at(-1).page, 71);
  assert.ok(passages.reduce((sum, p) => sum + p.text.length, 0) > 200_000);
});

test('a scanned page inside a long digital PDF is read and mapped to its original page', async (t) => {
  const pdf = await pdfWithPages(24);
  const png = await pdf.embedPng(await file('scanned-recipe-page.png'));
  pdf.getPage(11).drawImage(png, { x: 40, y: 50, width: 300, height: 500 });
  const calls = stubPdfAI(t);
  const result = await extract(Buffer.from(await pdf.save()), 'mixed.pdf');
  assert.equal(result.method, 'hybrid');
  assert.equal(result.visualPageCount, 1);
  assert.equal(calls.flat().length, 1);
  assert.match(result.pages[11].text, /PAGE-12/);
  assert.equal(result.pages[11].page, 12);
  assert.equal(result.pages.at(-1).page, 24);
});

test('a 41-page scan is fully read; missing chunk markers are retried individually', async (t) => {
  const pdf = await pdfWithPages(41, true);
  const calls = stubPdfAI(t, { omitMarkers: true });
  const result = await extract(Buffer.from(await pdf.save()), 'scan.pdf');
  assert.equal(result.pages.length, 41);
  assert.equal(result.truncated, false);
  assert.match(result.pages.at(-1).text, /PAGE-41/);
  assert.ok(calls.length > 9, 'omitted markers should cause individual page retries');
  for (let i = 0; i < 41; i++) assert.match(result.pages[i].text, new RegExp(`PAGE-${i + 1}\\b`));
});

test('formula, RTL, diagrams, columns and superscripts select visual reading', () => {
  const prose = 'Plants absorb sunlight and water. '.repeat(10);
  assert.equal(needsVisualReading({ text: prose, items: [], hasGraphics: false }), false);
  for (const text of [prose + 'x = 23', prose + 'שלום', prose + '2³']) assert.equal(needsVisualReading({ text, items: [], hasGraphics: false }), true);
  assert.equal(needsVisualReading({ text: prose, items: [], hasGraphics: true }), true);
  const items = [{ transform: [1, 0, 0, 12, 0, 100], width: 10 }, { transform: [1, 0, 0, 8, 12, 104], width: 5 }];
  assert.equal(needsVisualReading({ text: prose, items, hasGraphics: false }), true);
});

test('truncated or invalid AI transcription fails rather than accepting partial text', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => aiResponse('=== PAGE 1 ===\nPartial material', 'MAX_TOKENS'));
  const pdf = await pdfWithPages(1);
  await assert.rejects(extract(Buffer.from(await pdf.save()), 'short.pdf'), { code: 'TRANSCRIPTION_INVALID' });
});

test('Word tables retain cell relationships; nested rows and entities do not disappear', async () => {
  const result = await extract(await file('english-photosynthesis.docx'), 'biology.docx');
  assert.equal(result.method, 'text');
  assert.match(result.pages[0].text, /\|.*\|/);
  const nested = htmlToMarkdown('<table><tr><th>A</th><th>B</th></tr><tr><td>R&amp;D<table><tr><td>nested 17</td></tr></table></td><td>42</td></tr></table>');
  assert.match(nested, /R&D/);
  assert.match(nested, /nested 17/);
  assert.match(nested, /42/);
});

test('native Word equations require PDF instead of silently disappearing', async () => {
  const zip = await JSZip.loadAsync(await file('english-photosynthesis.docx'));
  const xml = await zip.file('word/document.xml').async('string');
  zip.file('word/document.xml', xml.replace('</w:body>', '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>x=2</m:t></m:r></m:oMath></w:body>'));
  await assert.rejects(docxToText(await zip.generateAsync({ type: 'nodebuffer' })), { code: 'DOCX_NEEDS_PDF' });
});

test('oversized compressed Word content is refused before inflation', async () => {
  const zip = new JSZip();
  zip.file('word/document.xml', '<w:document/>');
  zip.file('word/media/large.bin', Buffer.alloc(51 * 1024 * 1024));
  await assert.rejects(docxToText(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })), { code: 'DOCX_EXPANDED_TOO_LARGE' });
});

test('failure of a later PDF worker retains its actual error when sibling workers abort', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (++calls === 2) return aiResponse('Incomplete', 'MAX_TOKENS');
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  });
  const pdf = await pdfWithPages(6, true);
  await assert.rejects(extract(Buffer.from(await pdf.save()), 'scan.pdf'), { code: 'TRANSCRIPTION_INVALID' });
});

test('embedded Word scans are transcribed in place while native text and tables remain', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => aiResponse('=== PAGE 1 ===\nImage worksheet: $3^2 = 9$.\n\n| Student | Books |\n| --- | --- |\n| Omar | 18 |'));
  const result = await extract(await file('word-with-scanned-math.docx'), 'worksheet.docx');
  assert.equal(result.method, 'hybrid');
  assert.match(result.pages[0].text, /Photosynthesis/);
  assert.match(result.pages[0].text, /Image worksheet/);
  assert.match(result.pages[0].text, /Omar.*18/);
  assert.ok(result.pages[0].text.indexOf('Image worksheet') > result.pages[0].text.indexOf('Photosynthesis'));
});

test('failed Word image transcription fails the document instead of Mammoth omitting the image', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => aiResponse('Partial', 'MAX_TOKENS'));
  await assert.rejects(extract(await file('word-with-scanned-math.docx'), 'worksheet.docx'), { code: 'TRANSCRIPTION_INVALID' });
});
