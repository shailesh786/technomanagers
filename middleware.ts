/**
 * middleware.ts — Next.js Edge Middleware
 *
 * Runs on every matched request BEFORE the page renders.
 * Sole responsibility in Phase 1: refresh the Supabase auth session cookie
 * so Server Components always receive a valid (non-expired) session.
 *
 * In Phase 3 we will add route protection logic here (redirect /profile and
 * /admin to /auth when the user is unauthenticated).
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware-client';

export async function middleware(request: NextRequest) {
  // Start with a plain pass-through response so we can attach cookies to it
  const response = NextResponse.next({
    request,
  });

  // Calling getUser() refreshes the session cookie if it has expired.
  // This is the recommended pattern from @supabase/ssr — do NOT replace with
  // getSession() because getSession() does not validate the JWT on the server.
  const supabase = createSupabaseMiddlewareClient(request, response);
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico, site icons
     * - public folder files (robots.txt, sitemap, etc.)
     */
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
