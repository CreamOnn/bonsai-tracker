import { clearToken, getToken, signIn } from './auth'

/** fetch() with the Google access token. Expired or rejected tokens trigger a silent re-auth redirect. */
export async function gfetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  if (!token) signIn({ silent: true })

  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    clearToken()
    signIn({ silent: true })
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      message = (await res.json()).error?.message ?? message
    } catch {}
    throw new Error(`Google request failed: ${message}`)
  }
  return res
}

export async function gjson<T>(url: string, init: RequestInit = {}): Promise<T> {
  return (await gfetch(url, init)).json()
}

export function jsonBody(body: unknown, method = 'POST'): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
