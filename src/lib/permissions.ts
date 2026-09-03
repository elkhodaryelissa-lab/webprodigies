  
  export const isPublicRoutes =[
    '/login', '/signup', '/'
  ]
  export const isBypassRoutes =[
    "/api/auth(.*)",
    "/convex(.*)",
  ]
  export const isProtectedRoutes =['/dashboard(.*)']