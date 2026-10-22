import { ApiError, apiFetch } from './client'

// → { title, language, dir, audience, steps: [{ id, title, objective, sourceIds, checkQuestion }] }
export async function createPlan({ passages, teacherPrompt }, { apiKey, signal }) {
  const res = await apiFetch('/lessons/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passages, teacherPrompt }),
    apiKey,
    signal,
  })
  return res.json()
}

export async function translateLabels({ labels, language }, { apiKey, signal }) {
  const res = await apiFetch('/lessons/labels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels, language }),
    apiKey,
    signal,
  })
  return res.json()
}

// Streams one tutor message. Calls onDelta(text) for each piece as it arrives
// and resolves with the final { stepComplete, sourceIds }.
// Rejects with AbortError when the signal aborts (the Stop button).
export async function streamTurn(body, { apiKey, signal, onDelta }) {
  const res = await apiFetch('/lessons/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    apiKey,
    signal,
  })

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      // Events are separated by a blank line: "event: delta\ndata: {...}\n\n".
      let end
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const { event, data } = parseEvent(buffer.slice(0, end))
        buffer = buffer.slice(end + 2)
        if (event === 'delta') onDelta(data.text)
        if (event === 'meta') return data
        if (event === 'error') throw new ApiError(0, data.code, data.message)
      }
    }
  } catch (err) {
    if (err.name === 'AbortError' || err instanceof ApiError) throw err
    throw interrupted()
  }
  // The stream ended without its final event: the connection dropped.
  throw interrupted()
}

function parseEvent(raw) {
  const fields = Object.fromEntries(
    raw.split('\n').map((line) => {
      const colon = line.indexOf(':')
      return [line.slice(0, colon), line.slice(colon + 1).trim()]
    }),
  )
  return { event: fields.event, data: JSON.parse(fields.data) }
}

const interrupted = () =>
  new ApiError(0, 'STREAM_INTERRUPTED', 'The answer was cut off. Check your connection and try again.')
