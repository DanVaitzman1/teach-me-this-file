import assert from 'node:assert/strict';
import test from 'node:test';
import { translateLabels } from './translateLabels.js';

const labels = {
  title: 'Powers', audience: 'Grade 7',
  steps: [
    { id: 's1', title: 'Base', objective: 'Find the base' },
    { id: 's2', title: 'Exponent', objective: 'Find the exponent' },
  ],
};

function stubResponse(t, text) {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    candidates: [{ content: { role: 'model', parts: [{ text }] } }],
  }), { headers: { 'Content-Type': 'application/json' } }));
}

test('translation responses may reorder steps but cannot change their identity', async (t) => {
  stubResponse(t, JSON.stringify({ ...labels, title: 'Les puissances', steps: [...labels.steps].reverse() }));
  const translated = await translateLabels({ apiKey: 'test-key', labels, language: 'fr' });
  assert.equal(translated.title, 'Les puissances');
  assert.deepEqual(translated.steps.map((step) => step.id), ['s1', 's2']);
});

test('missing, duplicate, foreign and invalid translated steps are rejected', async (t) => {
  for (const steps of [[labels.steps[0]], [labels.steps[0], labels.steps[0]], [labels.steps[0], { ...labels.steps[1], id: 'other' }]]) {
    await t.test(JSON.stringify(steps.map((step) => step.id)), async (subtest) => {
      stubResponse(subtest, JSON.stringify({ ...labels, steps }));
      await assert.rejects(translateLabels({ apiKey: 'test-key', labels, language: 'ar' }), { code: 'TRANSLATION_INVALID' });
    });
  }
  await t.test('invalid JSON', async (subtest) => {
    stubResponse(subtest, 'not JSON');
    await assert.rejects(translateLabels({ apiKey: 'test-key', labels, language: 'ar' }), { code: 'TRANSLATION_INVALID' });
  });
});
