import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // Must be authenticated for all dashboard routes
      if (req.nextUrl.pathname.startsWith('/dashboard')) {
        return !!token
      }
      return true
    },
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
  ]
} 