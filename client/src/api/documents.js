import { apiFetch } from './client'

// → { fileName, method, truncated, passages: [{ id, page, text }] }
export async function uploadDocument(file, { apiKey, signal }) {
  const body = new FormData()
  body.append('file', file)
  const res = await apiFetch('/documents', { method: 'POST', body, apiKey, signal })
  return res.json()
}
