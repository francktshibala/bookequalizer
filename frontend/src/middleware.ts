import { clerkMiddleware } from '@clerk/nextjs'

export default clerkMiddleware({
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