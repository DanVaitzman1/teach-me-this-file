import { Router } from 'express';
import { z } from 'zod';
import { toAppError } from '../ai/gemini.js';
import { createPlan } from '../ai/plan.js';
import { openTutorStream, tutorEvents } from '../ai/tutor.js';
import { LessonLabelsSchema, translateLabels } from '../ai/translateLabels.js';
import { AppError } from '../errors.js';
import { log } from '../logger.js';
import { abortOnClose } from '../middleware/abortOnClose.js';
import { requireApiKey } from '../middleware/requireApiKey.js';
import { MAX_DOCUMENT_CHARS, MAX_PASSAGES, MAX_STEP_PASSAGES } from '../../../shared/documentLimits.mjs';

// The server keeps no lesson state, so the client sends the document's
// passages with the request. Limits match what /api/documents can produce.
const Passage = z.object({
  id: z.string().max(20),
  page: z.number().int().nullable(),
  text: z.string().max(5000),
});

const PlanRequest = z.object({
  teacherPrompt: z.string().trim().min(1).max(2000),
  passages: z.array(Passage).min(1).max(MAX_PASSAGES)
    .refine((passages) => passages.reduce((sum, passage) => sum + passage.text.length, 0) <= MAX_DOCUMENT_CHARS),
});

const LabelTranslationRequest = z.object({
  language: z.enum(['en', 'he', 'ar', 'fr', 'es']),
  labels: LessonLabelsSchema.refine((labels) => new Set(labels.steps.map((step) => step.id)).size === labels.steps.length,
    'step ids must be unique'),
});

// One tutor message. 'start_step' asks the tutor to open the current step;
// 'reply' answers the student's last message. Only the current step's passages
// and the recent messages are sent, which keeps every request small.
const TurnRequest = z
  .object({
    kind: z.enum(['start_step', 'reply']),
    teacherPrompt: z.string().trim().min(1).max(2000),
    plan: z.object({
      title: z.string().max(200),
      language: z.string().max(12),
      audience: z.string().max(200),
      steps: z
        .array(z.object({ title: z.string().max(200), objective: z.string().max(500), checkQuestion: z.string().max(500) }))
        .min(1)
        .max(10),
    }),
    stepIndex: z.number().int().min(0),
    passages: z.array(Passage).min(1).max(MAX_STEP_PASSAGES),
    messages: z.array(z.object({ role: z.enum(['tutor', 'student']), text: z.string().max(8000) })).max(20),
  })
  .refine((turn) => turn.stepIndex < turn.plan.steps.length, 'stepIndex is outside the plan')
  .refine((turn) => turn.kind === 'start_step' || turn.messages.at(-1)?.role === 'student', 'a reply needs a student message');

function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'The request is missing data or has the wrong shape.');
  return result.data;
}

export const lessonsRouter = Router();

// { teacherPrompt, passages } → lesson plan
lessonsRouter.post('/plan', requireApiKey, abortOnClose, async (req, res) => {
  const { teacherPrompt, passages } = parseBody(PlanRequest, req.body);
  const plan = await createPlan({ apiKey: req.apiKey, passages, teacherPrompt, signal: req.abortSignal });
  res.json(plan);
});

// Translate display labels without rebuilding the plan or changing lesson state.
lessonsRouter.post('/labels', requireApiKey, abortOnClose, async (req, res) => {
  const { language, labels } = parseBody(LabelTranslationRequest, req.body);
  res.json(await translateLabels({ apiKey: req.apiKey, labels, language, signal: req.abortSignal }));
});

// Server-Sent Events: `delta` events with the tutor's text as it is written,
// then one `meta` event ({ stepComplete, sourceIds }), or an `error` event if
// the stream breaks after it started. Errors before that are normal JSON errors.
lessonsRouter.post('/turn', requireApiKey, abortOnClose, async (req, res) => {
  const turn = parseBody(TurnRequest, req.body);
  const stream = await openTutorStream({ apiKey: req.apiKey, signal: req.abortSignal, ...turn });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Stops proxies (e.g. nginx on hosting platforms) from buffering the stream.
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const event of tutorEvents(stream, turn)) send(event.type, event.data);
  } catch (err) {
    if (req.abortSignal.aborted) {
      log.info('tutor_turn_stopped', { step: turn.stepIndex + 1 });
    } else {
      const { code, message } = toAppError(err);
      res.locals.errorCode = code;
      send('error', { code, message });
    }
  }
  res.end();
});
