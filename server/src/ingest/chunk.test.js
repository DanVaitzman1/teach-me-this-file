import assert from 'node:assert/strict';
import test from 'node:test';
import { toPassages } from './chunk.js';
import { MAX_DOCUMENT_CHARS, MAX_PASSAGE_CHARS } from '../../../shared/documentLimits.mjs';

const textOf = (pages) => toPassages(pages).passages.map((p) => p.text).join('\n');

test('long documents keep their final pages instead of truncating at 200k', () => {
  const pages = Array.from({ length: 100 }, (_, i) => ({ page: i + 1, text: `Chapter ${i + 1}\n${'School material. '.repeat(180)}` }));
  const result = toPassages(pages);
  assert.equal(result.truncated, false);
  assert.equal(result.passages.at(-1).page, 100);
  assert.match(result.passages.at(-1).text, /School material/);
  assert.match(textOf(pages), /Chapter 100/);
  assert.ok(result.passages.every((p) => p.text.length <= MAX_PASSAGE_CHARS));
});

test('an oversized document fails explicitly without returning a partial lesson', () => {
  assert.throws(() => toPassages([{ page: null, text: 'a'.repeat(MAX_DOCUMENT_CHARS + 1) }]), { code: 'DOCUMENT_TOO_LONG' });
  assert.equal(textOf([{ page: null, text: 'a'.repeat(MAX_DOCUMENT_CHARS) }]).replaceAll('\n', '').length, MAX_DOCUMENT_CHARS);
});

test('split tables retain every row, repeated headers and the passage size bound', () => {
  const rows = Array.from({ length: 120 }, (_, i) => `| plant-${i} | ${i * 17} |`);
  const table = ['| Plant | Height |', '| --- | --- |', ...rows].join('\n');
  const { passages } = toPassages([{ page: 4, text: table }]);
  assert.ok(passages.length > 1);
  for (const p of passages) {
    assert.ok(p.text.length <= MAX_PASSAGE_CHARS);
    assert.ok(p.text.startsWith('| Plant | Height |\n| --- | --- |'));
    assert.equal(p.page, 4);
  }
  for (const row of rows) assert.ok(passages.some((p) => p.text.includes(row)), row);
});

test('unusually wide rows, RTL and LaTeX are retained within passage bounds', () => {
  const text = `| A | B |\n| --- | --- |\n| ${'س'.repeat(2800)} | $\\frac{2}{3}$ |`;
  const { passages } = toPassages([{ page: 1, text }]);
  assert.ok(passages.every((p) => p.text.length <= MAX_PASSAGE_CHARS));
  assert.equal(passages.map((p) => p.text).join('').match(/س/g).length, 2800);
  assert.ok(passages.at(-1).text.includes('$\\frac{2}{3}$'));
});
