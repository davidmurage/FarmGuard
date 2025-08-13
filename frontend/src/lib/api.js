const BASE = import.meta.env.VITE_API_URL

export async function apiPost(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiGetAuth(path) {
  const token = localStorage.getItem('fg_token')
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
