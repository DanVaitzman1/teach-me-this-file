import { randomUUID } from 'node:crypto';
import { log, withRequestId } from '../logger.js';

// Gives each request a short id and logs one summary line when it ends:
// status, duration, the error code if it failed, and whether the client left early.
export function requestLogger(req, res, next) {
  const requestId = randomUUID().slice(0, 8);
  const start = performance.now();
  req.requestId = requestId;

  res.on('close', () => {
    const aborted = !res.writableFinished;
    const level = aborted || res.statusCode >= 500 ? 'warn' : 'info';
    withRequestId(requestId, () =>
      log[level]('request', {
        method: req.method,
        path: req.originalUrl,
        status: aborted ? 'client-closed' : res.statusCode,
        ms: Math.round(performance.now() - start),
        error: res.locals.errorCode,
      }),
    );
  });

  withRequestId(requestId, next);
}
