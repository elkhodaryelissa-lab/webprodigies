import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect
  } from '@convex-dev/auth/nextjs/server'
  import { isBypassRoutes, isPublicRoutes, isProtectedRoutes } from './lib/permissions'
  
  const PublicMatcher = createRouteMatcher(isPublicRoutes)
  const BypassMatcher = createRouteMatcher(isBypassRoutes)
  const ProtectedMatcher = createRouteMatcher(isProtectedRoutes)
  export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    if (BypassMatcher(request)) return
    const authed = await convexAuth.isAuthenticated()
    if (PublicMatcher(request) && authed) {
      return nextjsMiddlewareRedirect(request, `/dashboard`)
    }
    if (ProtectedMatcher(request) && !authed) {
        return nextjsMiddlewareRedirect(request, `/login`)
      }
      return 
  }, {
    cookieConfig:{maxAge: 60 * 60 * 24 * 30}
  }
)
  
  export const config = {
    // The following matcher runs middleware on all routes
    // except static assets.
    matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
  }