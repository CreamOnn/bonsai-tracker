// Minimal hash router: #/home, #/trees, #/pots, #/settings
export type Route = 'home' | 'trees' | 'pots' | 'settings'
const ROUTES: Route[] = ['home', 'trees', 'pots', 'settings']

function parse(): Route {
  const r = location.hash.replace(/^#\/?/, '').split('/')[0] as Route
  return ROUTES.includes(r) ? r : 'home'
}

export const router = $state({ route: parse() })

window.addEventListener('hashchange', () => {
  router.route = parse()
})

export function go(route: Route) {
  location.hash = `#/${route}`
}
