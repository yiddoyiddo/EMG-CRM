import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // Middleware function runs after authentication check
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role-based authorization check
    // Example: If trying to access an admin route AND the role is not ADMIN
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      // Redirect to the home page or a "not authorized" page
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      // The middleware only runs if this returns true (i.e., the user is logged in)
      authorized: ({ token }) => !!token,
    },
    pages: {
        signIn: '/auth/login',
    }
  }
);

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Protect all routes except auth, ALL api routes, static files, and public assets
    '/((?!api|auth|_next/static|_next/image|favicon.ico).*)',
  ]
};