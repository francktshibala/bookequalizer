import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: ['/'],
  ignoredRoutes: [
    '/api/health',
    '/_next/static/(.*)',
    '/_next/image(.*)',
    '/favicon.ico'
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}