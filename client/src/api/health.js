import { apiFetch } from './client'

export async function getHealth({ signal } = {}) {
  const res = await apiFetch('/health', { signal })
  return res.json()
}
