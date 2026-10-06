// iPhone home-screen apps keep serving a cached copy of the app. On launch and whenever
// the app comes back to the foreground, compare our build with the deployed one and
// reload if it changed — but never while a form (dialog) is open.
declare const __BUILD_ID__: string

async function check() {
  if (import.meta.env.DEV) return
  if (document.querySelector('[role="dialog"]')) return
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { build } = (await res.json()) as { build: string }
    if (build && build !== __BUILD_ID__ && !document.querySelector('[role="dialog"]')) location.reload()
  } catch {}
}

export function watchForUpdates() {
  check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}
