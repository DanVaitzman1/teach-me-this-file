import { AsyncLocalStorage } from 'node:async_hooks';

// One line per event: `time LEVEL [requestId] event key=value ...`.
// In production (Render) each line is JSON instead, so logs can be searched by field.
// Never log the API key or document text, only names, sizes, counts and timings.

const context = new AsyncLocalStorage();
const JSON_OUTPUT = process.env.NODE_ENV === 'production';
const COLORS = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
const RESET = '\x1b[0m';

// Runs fn so that every log line written inside it carries this request id,
// including lines from deep in the call stack and from parallel async work.
export function withRequestId(requestId, fn) {
  return context.run({ requestId }, fn);
}

function write(level, event, fields = {}) {
  const requestId = context.getStore()?.requestId;
  const { stack, ...rest } = fields;

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ time: new Date().toISOString(), level, requestId, event, ...fields }));
    return;
  }

  const time = new Date().toTimeString().slice(0, 8);
  const details = Object.entries(rest)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${typeof value === 'string' && /\s/.test(value) ? JSON.stringify(value) : value}`)
    .join(' ');
  const id = requestId ? `[${requestId}] ` : '';
  console.log(`${time} ${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET} ${id}${event} ${details}`);
  if (stack) console.log(stack);
}

export const log = {
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
};
