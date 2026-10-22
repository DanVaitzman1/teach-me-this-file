import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../errors.js';
import { toPassages } from '../ingest/chunk.js';
import { extractPages } from '../ingest/extract.js';
import { log } from '../logger.js';
import { abortOnClose } from '../middleware/abortOnClose.js';
import { requireApiKey } from '../middleware/requireApiKey.js';

const MAX_FILE_MB = 10;

// The file is kept in memory only for the length of the request; nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  // Browsers send file names as UTF-8; multer's default (latin1) garbles Hebrew, Arabic, etc.
  defParamCharset: 'utf8',
});

// Runs multer and translates its errors into our error format.
function receiveFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'FILE_TOO_LARGE', `Files up to ${MAX_FILE_MB} MB are supported.`));
    }
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, 'BAD_UPLOAD', err.message));
    }
    next(err);
  });
}

export const documentsRouter = Router();

// multipart file → { fileName, method, truncated, passages: [{ id, page, text }] }
documentsRouter.post('/', requireApiKey, receiveFile, abortOnClose, async (req, res) => {
  if (!req.file) throw new AppError(400, 'NO_FILE', 'Choose a file to upload.');

  const fileName = req.file.originalname;
  log.info('upload_received', { file: fileName, kb: Math.ceil(req.file.size / 1024) });

  const extracted = await extractPages({
    buffer: req.file.buffer,
    fileName,
    apiKey: req.apiKey,
    signal: req.abortSignal,
  });

  const { passages, truncated: overCharLimit } = toPassages(extracted.pages);
  const truncated = extracted.truncated || overCharLimit;
  if (passages.length === 0) {
    throw new AppError(422, 'EMPTY_DOCUMENT', 'No text was found in this file.');
  }

  log.info('upload_extracted', {
    method: extracted.method,
    pages: extracted.pages.length,
    passages: passages.length,
    chars: passages.reduce((sum, passage) => sum + passage.text.length, 0),
    truncated,
  });
  res.json({ fileName, method: extracted.method, truncated, passages });
});
