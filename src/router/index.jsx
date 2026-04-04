/**
 * History-API router — clean URLs with no # prefix.
 *
 * Uses window.history.pushState / popstate.
 * For deployment: configure your server/CDN to serve index.html for all routes.
 *   - Vite dev server: already handled
 *   - Netlify: add a _redirects file (/* /index.html 200)
 *   - Vercel: add vercel.json rewrites
 *   - Nginx: try_files $uri /index.html
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const RouterContext = createContext(null)

function parsePath() {
  return window.location.pathname || '/'
}

export function RouterProvider({ children }) {
  const [path, setPath] = useState(parsePath)

  useEffect(() => {
    const onPop = () => setPath(parsePath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to) => {
    window.history.pushState(null, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}

// Supports :param segments and * wildcard
function matchRoute(pattern, path) {
  if (pattern === '*') return {}
  const pp = pattern.split('/').filter(Boolean)
  const ph = path.split('/').filter(Boolean)
  if (pp.length !== ph.length) return null
  const params = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(ph[i])
    else if (pp[i] !== ph[i]) return null
  }
  return params
}

export function useParams(pattern) {
  const { path } = useRouter()
  return matchRoute(pattern, path) ?? {}
}

export function useMatch(pattern) {
  const { path } = useRouter()
  return matchRoute(pattern, path) !== null
}

export function Routes({ children }) {
  const { path } = useRouter()
  const arr = (Array.isArray(children) ? children : [children]).filter(Boolean).flat()
  let fallback = null
  for (const child of arr) {
    if (!child?.props?.path) continue
    if (child.props.path === '*') { fallback = child; continue }
    const params = matchRoute(child.props.path, path)
    if (params !== null) {
      const Component = child.props.component
      return <Component params={params} />
    }
  }
  if (fallback) {
    const Component = fallback.props.component
    return <Component params={{}} />
  }
  return null
}

export function Route() { return null }

export function Link({ to, children, className = '', onClick, ...rest }) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        navigate(to)
        onClick?.()
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
