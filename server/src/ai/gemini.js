import { setTimeout as sleep } from 'node:timers/promises';
import { ApiError, GoogleGenAI } from '@google/genai';
import { AppError } from '../errors.js';
import { log } from '../logger.js';

// Models to try in order, per task. The next one is used when the previous one
// is not available to this key (404; Gemini 2.5 models are closed to new users),
// out of quota (429) or overloaded (503). Free-tier quotas are counted per model:
// most Flash models allow 5 requests/minute and 20/day, gemini-3.1-flash-lite
// allows 15/minute and 500/day. Override each list with a comma-separated env var.
const modelList = (envValue, fallback) => (envValue ? envValue.split(',').map((m) => m.trim()) : fallback);

export const MODELS = {
  // Many requests per upload: the high-quota model first.
  transcribe: modelList(process.env.GEMINI_TRANSCRIBE_MODELS, [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
  ]),
  // One request per lesson, and the plan shapes the whole lesson: the strongest model first.
  plan: modelList(process.env.GEMINI_PLAN_MODELS, ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']),
  // One request per student message: high-quota, fast models first.
  tutor: modelList(process.env.GEMINI_TUTOR_MODELS, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash']),
};

const SWITCH_MODEL_STATUSES = [404, 429, 503];

// Gemini answers 503 "high demand" in bursts. The SDK retries server errors
// briefly (2s, then 4s); if a model is still overloaded we move on to the next
// model instead of waiting longer. 429 is handled in withRateLimitRetry.
const RETRY_OPTIONS = { attempts: 3, initialDelay: 2, maxDelay: 8, httpStatusCodes: [500, 503, 504] };

// A per-minute quota frees up within a minute. When another model is left we
// switch to it right away; only the last model is worth waiting for, once.
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

// A client per request, because every request may carry a different user key.
function createClient(apiKey) {
  return new GoogleGenAI({ apiKey, httpOptions: { retryOptions: RETRY_OPTIONS } });
}

// generateContent on the first model that is available and not overloaded.
// `label` names the call in the logs (e.g. "transcribe chunk 2/4").
export async function generateContent(apiKey, models, request, label) {
  const { result: response, model, ms } = await withModelFallback(apiKey, models, request, label, (client, req) =>
    client.models.generateContent(req),
  );
  const usage = response.usageMetadata ?? {};
  log.info('gemini_ok', {
    call: label,
    model,
    ms,
    tokensIn: usage.promptTokenCount,
    tokensOut: usage.candidatesTokenCount,
    tokensThinking: usage.thoughtsTokenCount,
  });
  return response;
}

// Like generateContent, but returns the open stream of chunks. Falling back to
// another model is only possible here, before the first chunk arrives: quota
// and overload errors come back as soon as the request is made.
export async function generateContentStream(apiKey, models, request, label) {
  const { result: stream, model } = await withModelFallback(apiKey, models, request, label, (client, req) =>
    client.models.generateContentStream(req),
  );
  return { stream, model };
}

// Calls `call(client, request)` with each model in turn until one succeeds.
async function withModelFallback(apiKey, models, request, label, call) {
  const client = createClient(apiKey);
  for (const [index, model] of models.entries()) {
    const isLast = index === models.length - 1;
    const start = performance.now();
    try {
      const result = await withRateLimitRetry(() => call(client, { ...request, model }), {
        canWait: isLast,
        signal: request.config?.abortSignal,
        label,
        model,
      });
      return { result, model, ms: Math.round(performance.now() - start) };
    } catch (err) {
      if (isLast || !(err instanceof ApiError) || !SWITCH_MODEL_STATUSES.includes(err.status)) throw err;
      log.warn('gemini_fallback', {
        call: label,
        model,
        status: err.status,
        ms: Math.round(performance.now() - start),
        next: models[index + 1],
        reason: googleMessage(err),
      });
    }
  }
}

// One wait-and-retry when a per-minute quota is hit and waiting is allowed.
// A daily quota fails right away: waiting wouldn't help.
async function withRateLimitRetry(callOnce, { canWait, signal, label, model }) {
  try {
    return await callOnce();
  } catch (err) {
    const waitMs = perMinuteRetryDelay(err);
    if (!canWait || waitMs === null || waitMs > MAX_RATE_LIMIT_WAIT_MS) throw err;
    log.warn('gemini_rate_limit_wait', { call: label, model, waitMs });
    await sleep(waitMs, undefined, { signal });
    return callOnce();
  }
}

// Google's 429 body names the quota (e.g. "...PerMinutePerProjectPerModel-FreeTier")
// and says when to retry ("retryDelay":"17s").
function perMinuteRetryDelay(err) {
  if (!(err instanceof ApiError) || err.status !== 429 || !/PerMinute/.test(err.message)) return null;
  const match = err.message.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
  return match ? Math.ceil(Number(match[1]) * 1000) + 500 : null;
}

// The SDK's error message is Google's whole JSON body; the human part is error.message.
function googleMessage(err) {
  try {
    return JSON.parse(err.message).error.message.split('\n')[0];
  } catch {
    return err.message;
  }
}

// Turns SDK failures into errors the UI can act on, logging the details we hide from the user.
export function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403 || /api key not valid/i.test(err.message)) {
      log.warn('gemini_invalid_key', { status: err.status });
      return new AppError(401, 'INVALID_API_KEY', 'The Gemini API key was rejected. Check it in Settings.');
    }
    if (err.status === 429) {
      log.warn('gemini_rate_limited', {
        reason: 'the last model is out of quota',
        quota: err.message.match(/"quotaId":"([^"]+)"/)?.[1],
        limit: err.message.match(/"quotaValue":"([^"]+)"/)?.[1],
        retryIn: err.message.match(/"retryDelay":"([^"]+)"/)?.[1],
      });
      return new AppError(429, 'RATE_LIMITED', 'The AI is getting too many requests. Wait a minute and try again.');
    }
    if (err.status === 503) {
      log.warn('gemini_overloaded', { reason: 'the last model returned 503' });
      return new AppError(503, 'AI_BUSY', 'The AI model is overloaded right now. Please try again in a minute.');
    }
  }

  log.error('gemini_error', { status: err.status, reason: err instanceof ApiError ? googleMessage(err) : err.message });
  return new AppError(502, 'AI_ERROR', 'The AI service failed. Please try again.');
}
