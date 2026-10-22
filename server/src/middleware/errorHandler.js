import { AppError } from '../errors.js';
import { log } from '../logger.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `No such endpoint: ${req.method} ${req.originalUrl}`));
}

// Every error leaves the server as { error: { code, message } }.
// The code is also put on res.locals so the request log line shows it.
// Unexpected errors are logged with their stack (never request headers, so the
// key never reaches the logs) and replaced with a generic message.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const send = (status, code, message) => {
    res.locals.errorCode = code;
    // The client already disconnected, so there is no one to answer.
    if (req.abortSignal?.aborted) return;
    res.status(status).json({ error: { code, message } });
  };

  if (err instanceof AppError) return send(err.status, err.code, err.message);

  // Errors thrown by Express itself, e.g. malformed or oversized JSON bodies.
  if (err.expose && err.status < 500) return send(err.status, 'BAD_REQUEST', err.message);

  if (req.abortSignal?.aborted) return send(499, 'CLIENT_CLOSED');

  log.error('unexpected_error', { message: err.message, stack: err.stack });
  send(500, 'INTERNAL_ERROR', 'Something went wrong on the server.');
}
