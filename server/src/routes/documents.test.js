import assert from 'node:assert/strict';
import test from 'node:test';
import { app } from '../app.js';
import { readFile } from 'node:fs/promises';
const image = await readFile(new URL('../../../test-files/scanned-recipe-page.png', import.meta.url));
import { PDFDocument } from 'pdf-lib';

const localFetch = globalThis.fetch;
async function start(t) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/documents`;
  const upload = async (data, name = 'material.txt', options = {}) => {
    const body = new FormData();
    if (data !== null) body.append('file', new Blob([data]), name);
    const response = await localFetch(url, { method: 'POST', headers: { 'X-Gemini-Key': 'test-key' }, body, ...options });
    return { status: response.status, ...await response.json() };
  };
  upload.json = async (body) => {
    const result = await localFetch(url.replace('/documents', '/lessons/plan'), { method: 'POST', headers: { 'X-Gemini-Key': 'test-key', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: result.status, ...await result.json() };
  };
  upload.health = () => localFetch(url.replace('/documents', '/health'));
  return upload;
}
function response(text) {
  return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }] }), { headers: { 'Content-Type': 'application/json' } });
}

test('upload errors are recoverable and original UTF-8 file names are retained', async (t) => {
  const upload = await start(t);
  for (const [data, name, status, code] of [
    [null, '', 400, 'NO_FILE'], ['', 'empty.txt', 422, 'EMPTY_DOCUMENT'],
    ['x', 'wrong.exe', 415, 'UNSUPPORTED_FILE'], ['not a PDF', 'broken.pdf', 422, 'UNREADABLE_FILE'],
    ['a'.repeat(500_001), 'long.txt', 413, 'DOCUMENT_TOO_LONG'],
    [Buffer.alloc(25 * 1024 * 1024 + 1), 'large.txt', 413, 'FILE_TOO_LARGE'],
  ]) {
    const result = await upload(data, name);
    assert.equal(result.status, status, JSON.stringify(result));
    assert.equal(result.error.code, code);
    assert.equal((await upload('Water evaporates when heated.', 'מים-ماء.txt')).fileName, 'מים-ماء.txt');
  }
});

test('a PDF larger than the old 10 MB cap is accepted, with every page represented', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response('=== PAGE 1 ===\nWater evaporates when heated.'));
  const upload = await start(t);
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Water evaporates when heated.');
  pdf.context.register(pdf.context.stream(Buffer.alloc(12 * 1024 * 1024, 97)));
  const bytes = await pdf.save({ useObjectStreams: false });
  assert.ok(bytes.length > 10 * 1024 * 1024);
  const result = await upload(bytes, 'large-valid.pdf');
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.pageCount, 1);
  assert.equal(result.truncated, false);
  assert.match(result.passages[0].text, /Water evaporates/);
});

test('diagram-only material is retained, blank scans are rejected', async (t) => {
  let transcription = '[A diagram showing rain flowing from clouds to the sea.]';
  t.mock.method(globalThis, 'fetch', async () => response(transcription));
  const upload = await start(t);
  assert.equal((await upload(image, 'diagram.png')).status, 200);
  transcription = '=== PAGE 1 ===\n';
  const blank = await upload(image, 'blank.png');
  assert.equal(blank.error.code, 'EMPTY_DOCUMENT');
});

test('concurrent uploads get a retryable error; cancellation releases the processing slot', async (t) => {
  let announceStarted;
  const started = new Promise((resolve) => { announceStarted = resolve; });
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    announceStarted();
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  });
  const upload = await start(t);
  const controller = new AbortController();
  const first = upload(image, 'scan.png', { signal: controller.signal });
  const aborted = assert.rejects(first, { name: 'AbortError' });
  await started;
  assert.equal((await upload('Other material')).error.code, 'DOCUMENT_BUSY');
  controller.abort();
  await aborted;
  let result;
  for (let i = 0; i < 20; i++) {
    result = await upload('Water becomes water vapour.');
    if (result.status === 200) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(result.status, 200);
});

test('the real API accepts a multilingual plan body over 1 MB and validates its total text bound', async (t) => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    sent = options.body;
    return response(JSON.stringify({ title: 'Plants', language: 'en', audience: 'Grade 7', steps: [{ title: 'Growth', objective: 'Understand growth', checkQuestion: 'Why?', sourceIds: ['p500'] }] }));
  });
  const upload = await start(t);
  const passages = Array.from({ length: 500 }, (_, i) => ({ id: `p${i + 1}`, page: null, text: '水'.repeat(1000) }));
  const body = { passages, teacherPrompt: 'Teach this in English.' };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 1024 * 1024);
  const result = await upload.json(body);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.match(sent, /\[p500\]/);
  assert.deepEqual(result.steps[0].sourceIds, ['p500']);
  const tooLong = await upload.json({ ...body, passages: [...passages, { id: 'extra', page: null, text: 'a' }] });
  assert.equal(tooLong.status, 400);
});

test('a pathological PDF exhausts only its parser worker; health and the next upload survive', async (t) => {
  let providerCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => { providerCalls++; throw new Error('No AI call expected'); });
  const upload = await start(t);
  // A valid one-page PDF with an unused, enormous hex-string object. Build it
  // directly: asking pdf-lib to parse/save this fixture would stress the test
  // process before we even exercised the isolated API parser.
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\n',
    '4 0 obj\n<',
  ];
  let head = '%PDF-1.7\n';
  const offsets = objects.map((object) => { const offset = head.length; head += object; return offset; });
  const hex = Buffer.alloc(24 * 1024 * 1024, 97);
  const endObject = '>\nendobj\n';
  const xrefOffset = head.length + hex.length + endObject.length;
  const xref = 'xref\n0 5\n0000000000 65535 f \n' + offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  const tail = `${endObject}${xref}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const resultPromise = upload(Buffer.concat([Buffer.from(head), hex, Buffer.from(tail)]), 'complex.pdf');
  assert.equal((await upload.health()).status, 200);
  const result = await resultPromise;
  assert.equal(result.status, 422);
  assert.equal(result.error.code, 'DOCUMENT_COMPLEX');
  assert.equal(providerCalls, 0);
  assert.equal((await upload('Water evaporates when heated.')).status, 200);
});
