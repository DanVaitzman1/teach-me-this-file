import { parentPort, workerData } from 'node:worker_threads';
import { extractPages } from './extract.js';
import { AppError } from '../errors.js';
import { withRequestId } from '../logger.js';
import { MAX_DOCUMENT_CHARS } from '../../../shared/documentLimits.mjs';

withRequestId(workerData.requestId, async () => {
  try {
    const { bytes } = workerData;
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const result = await extractPages({ buffer, fileName: workerData.fileName });
    if (result.pages.reduce((sum, page) => sum + page.text.length, 0) > MAX_DOCUMENT_CHARS) {
      throw new AppError(413, 'DOCUMENT_TOO_LONG', 'This document exceeds 500,000 characters. Split it into chapters.');
    }
    parentPort.postMessage({ type: 'result', result });
  } catch (err) {
    const error = err instanceof AppError ? err : new AppError(422, 'UNREADABLE_FILE', 'This file could not be read. Try exporting it as a new PDF.');
    parentPort.postMessage({ type: 'error', error: { status: error.status, code: error.code, message: error.message } });
  }
});
