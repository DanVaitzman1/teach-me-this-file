export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Thin wrapper around fetch for our own /api endpoints.
// Adds the user's API key header and turns every failure into an ApiError,
// except aborts, which are rethrown as-is so callers can ignore them.
// Returns the raw Response so streaming endpoints can read the body themselves.
export async function apiFetch(path, { apiKey, headers, ...options } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { ...headers, ...(apiKey && { 'X-Gemini-Key': apiKey }) },
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (body?.error) throw new ApiError(res.status, body.error.code, body.error.message)
    // No error body from our server: something in between answered instead
    // (the dev proxy or the host), usually because the server crashed, is
    // restarting or is still waking up.
    throw new ApiError(
      res.status,
      'SERVER_UNAVAILABLE',
      `The server did not answer (${res.status}). It may be restarting; try again in a moment.`,
    )
  }
  return res
}
