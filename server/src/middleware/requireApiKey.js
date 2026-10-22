import { AppError } from '../errors.js';

// The user's key comes in a header on every request and lives only on `req`
// for that request. It is never stored or logged. GEMINI_API_KEY on the host
// is an optional fallback.
export function requireApiKey(req, res, next) {
  const apiKey = req.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return next(new AppError(401, 'MISSING_API_KEY', 'Add your Gemini API key in Settings.'));
  }
  req.apiKey = apiKey;
  next();
}
