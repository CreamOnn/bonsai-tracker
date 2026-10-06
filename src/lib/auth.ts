// Google OAuth 2.0 implicit (token) flow via full-page redirect.
// Popups are unreliable in iOS home-screen apps, so we always redirect.
import { CLIENT_ID, SCOPES } from './config'

const TOKEN_KEY = 'bt.token'
const STATE_KEY = 'bt.oauth_state'
const RETURN_KEY = 'bt.oauth_return'
const SILENT_KEY = 'bt.oauth_silent'
const EMAIL_KEY = 'bt.email'

type Token = { access_token: string; expires_at: number }

export class AuthRedirect extends Error {
  constructor() {
    super('Redirecting to Google sign-in')
  }
}

function redirectUri() {
  return location.origin + import.meta.env.BASE_URL
}

/**
 * Call once on load. Picks up a token (or error) Google put in the URL hash.
 * Returns 'ok' on success, 'silent_failed' if a background refresh needs the
 * user to sign in again, or null if this load wasn't an OAuth return.
 */
export function consumeRedirect(): 'ok' | 'silent_failed' | null {
  const hash = location.hash.slice(1)
  if (!hash.includes('access_token=') && !hash.includes('error=')) return null

  const p = new URLSearchParams(hash)
  const expected = localStorage.getItem(STATE_KEY)
  const ret = localStorage.getItem(RETURN_KEY) || '#/home'
  const wasSilent = localStorage.getItem(SILENT_KEY) === '1'
  localStorage.removeItem(STATE_KEY)
  localStorage.removeItem(RETURN_KEY)
  localStorage.removeItem(SILENT_KEY)
  history.replaceState(null, '', location.pathname + ret)

  if (!expected || p.get('state') !== expected) throw new Error('Sign-in state mismatch. Please try again.')

  const error = p.get('error')
  if (error) {
    if (wasSilent) return 'silent_failed'
    if (error === 'access_denied') throw new Error('Sign-in was cancelled.')
    throw new Error(`Sign-in failed: ${error}`)
  }

  const token: Token = {
    access_token: p.get('access_token')!,
    expires_at: Date.now() + (Number(p.get('expires_in') ?? 3600) - 60) * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return 'ok'
}

export function getToken(): string | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as Token | null
    return t && t.expires_at > Date.now() ? t.access_token : null
  } catch {
    return null
  }
}

export function hasSignedInBefore() {
  return localStorage.getItem(EMAIL_KEY) !== null
}

export function rememberEmail(email: string) {
  localStorage.setItem(EMAIL_KEY, email)
}

/** Leaves the page for Google. With silent, Google returns straight away if consent already exists. */
export function signIn(opts: { silent?: boolean } = {}): never {
  const state = crypto.randomUUID()
  const current = location.hash && location.hash !== '#' ? location.hash : '#/home'
  localStorage.setItem(STATE_KEY, state)
  localStorage.setItem(RETURN_KEY, current)
  localStorage.setItem(SILENT_KEY, opts.silent ? '1' : '0')

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPES,
    state,
    include_granted_scopes: 'true',
  })
  const hint = localStorage.getItem(EMAIL_KEY)
  if (hint) params.set('login_hint', hint)
  if (opts.silent) params.set('prompt', 'none')

  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + params)
  throw new AuthRedirect()
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function signOut() {
  const token = getToken()
  clearToken()
  localStorage.removeItem(EMAIL_KEY)
  if (token) {
    await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(token), {
      method: 'POST',
    }).catch(() => {})
  }
}
