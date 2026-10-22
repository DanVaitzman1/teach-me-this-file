import { app, servesClient } from './app.js';
import { MODELS } from './ai/gemini.js';
import { log } from './logger.js';

const PORT = process.env.PORT || 3001;
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
