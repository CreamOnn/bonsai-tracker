// Minimal hash router: #/home, #/trees, #/trees/<id>, #/pots, #/settings
export type Route = 'home' | 'trees' | 'pots' | 'settings'
const ROUTES: Route[] = ['home', 'trees', 'pots', 'settings']

function parse(): { route: Route; param: string } {
  const [r, param = ''] = location.hash.replace(/^#\/?/, '').split('/')
  return ROUTES.includes(r as Route) ? { route: r as Route, param: decodeURIComponent(param) } : { route: 'home', param: '' }
}

export const router = $state(parse())

window.addEventListener('hashchange', () => {
  Object.assign(router, parse())
  window.scrollTo(0, 0)
})

export function go(route: Route, param = '') {
  location.hash = param ? `#/${route}/${encodeURIComponent(param)}` : `#/${route}`
}
