import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from './plan.js';

const passages = Array.from({ length: 41 }, (_, i) => ({ id: `p${i + 1}`, page: i + 1, text: `Material ${i + 1}` }));
const step = { title: 'Compare', objective: 'Compare the examples', checkQuestion: 'What changes?', sourceIds: ['p41', 'p41', 'unknown'] };
function stub(t, steps) {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const request = JSON.parse(options.body);
    // Simulate the observed provider incompatibility, not a successful mock
    // that would conceal a broken fallback request.
    const sourceSchema = request.generationConfig.responseJsonSchema.properties.steps.items.properties.sourceIds;
    if (sourceSchema.maxItems > 10) return new Response(JSON.stringify({ error: { code: 400, message: 'Invalid argument' } }), { status: 400 });
    return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ title: 'Comparison', language: 'ar', audience: 'Grade 7', steps }) }] } }] }), { headers: { 'Content-Type': 'application/json' } });
  });
}

test('plan generation works with the fallback-compatible grammar and original final-page ids', async (t) => {
  stub(t, [step]);
  const result = await createPlan({ apiKey: 'test-key', passages, teacherPrompt: 'Teach in Arabic.' });
  assert.equal(result.dir, 'rtl');
  assert.deepEqual(result.steps[0].sourceIds, ['p41']);
});

test('a plan exceeding the tutor source budget is rejected instead of silently dropping references', async (t) => {
  stub(t, [{ ...step, sourceIds: passages.map((p) => p.id) }]);
  await assert.rejects(createPlan({ apiKey: 'test-key', passages, teacherPrompt: 'Teach this.' }), { code: 'PLAN_INVALID' });
});
