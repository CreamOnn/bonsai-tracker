// iPhone home-screen apps keep serving a cached copy of the app. On launch and whenever
// the app comes back to the foreground, compare our build with the deployed one and
// reload if it changed — but never while a form (dialog) is open.
//
// GitHub Pages lets browsers cache index.html for 10 minutes, so a plain reload can
// return the same old page and loop. We refresh the cached page first, and only try
// once per build within a short window.
declare const __BUILD_ID__: string

const ATTEMPT_KEY = 'bt.update_attempt'
const RETRY_AFTER_MS = 2 * 60 * 1000

function recentlyTried(build: string) {
  try {
    const a = JSON.parse(localStorage.getItem(ATTEMPT_KEY) ?? 'null') as { build: string; at: number } | null
    return !!a && a.build === build && Date.now() - a.at < RETRY_AFTER_MS
  } catch {
    return false
  }
}

async function check() {
  if (import.meta.env.DEV) return
  if (document.querySelector('[role="dialog"]')) return
  try {
    const base = import.meta.env.BASE_URL
    const res = await fetch(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { build } = (await res.json()) as { build: string }
    if (!build || build === __BUILD_ID__ || recentlyTried(build)) return

    localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ build, at: Date.now() }))
    // Replace the browser's cached copy of the page before reloading.
    await Promise.all([fetch(base, { cache: 'reload' }), fetch(`${base}index.html`, { cache: 'reload' })]).catch(() => {})
    if (!document.querySelector('[role="dialog"]')) location.reload()
  } catch {}
}

export function watchForUpdates() {
  check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}
