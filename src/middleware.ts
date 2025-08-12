import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // Middleware function runs after authentication check
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const url = req.nextUrl;

    // Test mode bypass for E2E: allow unauthenticated access when explicitly requested
    // Usage: append ?test=1 to URLs or send header x-cypress-test=1
    const testFlag = url.searchParams.get('test') === '1' || req.headers.get('x-cypress-test') === '1';
    const allowTestBypass = process.env.E2E_TEST_MODE === '1';
    const isTestBypass = allowTestBypass && testFlag;

    // Skip onboarding checks for specific paths
    if (isTestBypass || path === "/onboarding" || path.startsWith("/auth") || path.startsWith("/api")) {
      // Continue with normal middleware logic
    } else if (token && (!token.name || token.name.trim() === "")) {
      // User needs onboarding - redirect to onboarding flow
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Role-based authorization check
    // Admin routes require ADMIN role
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // Management routes require MANAGER or above
    if (path.startsWith("/management") && 
        !["ADMIN", "DIRECTOR", "MANAGER"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // Team lead routes require TEAM_LEAD or above
    if (path.startsWith("/team") && 
        !["ADMIN", "DIRECTOR", "MANAGER", "TEAM_LEAD"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // The middleware only runs if this returns true (i.e., the user is logged in)
      authorized: ({ token, req }) => {
        const url = req.nextUrl;
        const testFlag = url.searchParams.get('test') === '1' || req.headers.get('x-cypress-test') === '1';
        const allowTestBypass = process.env.E2E_TEST_MODE === '1';
        const isTestBypass = allowTestBypass && testFlag;
        if (isTestBypass) return true;
        return !!token;
      },
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