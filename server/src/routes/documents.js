import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../errors.js';
import { toPassages } from '../ingest/chunk.js';
import { extractDocument } from '../ingest/workerHost.js';
import { log } from '../logger.js';
import { abortOnClose } from '../middleware/abortOnClose.js';
import { requireApiKey } from '../middleware/requireApiKey.js';
import { MAX_FILE_MB } from '../../../shared/documentLimits.mjs';

// Parsing PDFs creates additional copies beyond the upload itself. One heavy
// ingestion at a time bounds that memory; tutor/plan streams remain independent.
let processing = false;
function reserveUpload(req, res, next) {
  if (processing) return next(new AppError(503, 'DOCUMENT_BUSY', 'Another file is being read. Please retry shortly.'));
  processing = true;
  let released = false;
  req.releaseUpload = () => {
    if (!released) processing = false;
    released = true;
  };
  res.on('close', () => { if (!req.extracting) req.releaseUpload(); });
  next();
}

// The file is kept in memory only for the length of the request; nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 },
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

// Keep meaningful diagram descriptions. Only known empty/unreadable markers
// are removed; stripping every bracketed description would discard diagrams.
function hasReadableText(passages) {
  return passages.some((passage) => /[\p{L}\p{N}]/u.test(passage.text.replace(
    /\[(?:unclear|blank page|page blanche|עמוד ריק|صفحة فارغة|página en blanco)\]/gi, '',
  )));
}

export const documentsRouter = Router();

// multipart file → { fileName, method, truncated, passages: [{ id, page, text }] }
documentsRouter.post('/', requireApiKey, abortOnClose, reserveUpload, receiveFile, async (req, res) => {
  req.extracting = true;
  try {
    req.abortSignal.throwIfAborted();
    if (!req.file) throw new AppError(400, 'NO_FILE', 'Choose a file to upload.');

    const fileName = req.file.originalname;
    log.info('upload_received', { file: fileName, kb: Math.ceil(req.file.size / 1024) });

    const reading = extractDocument({
      buffer: req.file.buffer,
      fileName,
      apiKey: req.apiKey,
      signal: req.abortSignal,
      requestId: req.requestId,
    });
    // The worker now owns its transferred copy; release Multer's original.
    req.file.buffer = null;
    const extracted = await reading;

    const { passages } = toPassages(extracted.pages);
    const truncated = false;
    if (!hasReadableText(passages)) {
      throw new AppError(422, 'EMPTY_DOCUMENT', 'No text was found in this file.');
    }

    log.info('upload_extracted', {
      method: extracted.method,
      pages: extracted.pages.length,
      passages: passages.length,
      chars: passages.reduce((sum, passage) => sum + passage.text.length, 0),
      truncated,
    });
    res.json({ fileName, method: extracted.method, truncated, passages,
      pageCount: extracted.pageCount ?? null, visualPageCount: extracted.visualPageCount ?? null });
  } finally {
    req.releaseUpload();
  }
});
