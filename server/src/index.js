import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { MODELS } from './ai/gemini.js';
import { log } from './logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { documentsRouter } from './routes/documents.js';
import { lessonsRouter } from './routes/lessons.js';

const app = express();
const PORT = process.env.PORT || 3001;

// The built client (`npm run build`). In production one server answers both
// the API and the app, from the same origin. In development Vite serves the
// client instead and this folder doesn't exist.
const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const servesClient = existsSync(path.join(CLIENT_DIST, 'index.html'));

app.use('/api', requestLogger);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasServerKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.use('/api/documents', documentsRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api', notFound);

if (servesClient) {
  app.use(express.static(CLIENT_DIST));
  // Any other path is the single-page app.
  app.get('/{*path}', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.use(errorHandler);

app.listen(PORT, () => {
  log.info('server_started', {
    url: `http://localhost:${PORT}`,
    servesClient,
    serverKey: Boolean(process.env.GEMINI_API_KEY),
    transcribeModels: MODELS.transcribe.join(','),
    planModels: MODELS.plan.join(','),
    tutorModels: MODELS.tutor.join(','),
  });
});
