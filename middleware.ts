/**
 * middleware.ts — Next.js Edge Middleware
 *
 * Runs on every matched request BEFORE the page renders.
 * Responsibilities:
 *   1. Refresh the Supabase auth session cookie (always)
 *   2. Redirect unauthenticated users away from /profile and /admin
 *   3. Redirect already-authenticated users away from /auth
 *
 * Why getUser() and not getSession()?
 *   getSession() reads the JWT from the cookie without validating it.
 *   getUser() sends the JWT to Supabase to validate it server-side, which
 *   prevents spoofed cookies from bypassing auth guards.
 *   The extra network round-trip is worth it for protected routes.
 *
 * Admin role check (is_admin column) is NOT done here — that requires a DB
 * query and would add latency to every request. Admin routes rely on the
 * client-side AdminRoute component for role enforcement; middleware only
 * checks that the user is authenticated at all.
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware-client';

export async function middleware(request: NextRequest) {
  // ── 1. Build a pass-through response so we can attach refreshed cookies ──
  const response = NextResponse.next({ request });

  // ── 2. Validate + refresh the session cookie ──────────────────────────────
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── 3. Route guards ───────────────────────────────────────────────────────

  // /profile — requires sign-in
  // Preserve the intended path so /auth/callback can redirect back after login.
  if (pathname.startsWith('/profile') && !user) {
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // /admin — requires sign-in (role check is done client-side by AdminRoute)
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // /auth — skip if already signed in
  if (pathname === '/auth' && user) {
    return NextResponse.redirect(new URL('/questions', request.url));
  }

  // ── 4. All other routes — just return the response with refreshed cookies ─
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico and other icons
     * - public folder files (robots.txt, sitemap, opengraph images, etc.)
     */
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
