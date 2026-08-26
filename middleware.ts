/**
 * middleware.ts — Next.js Edge Middleware
 *
 * Runs ONLY on the routes in the matcher below — the ones that actually read
 * the session server-side. It used to match essentially every request, which
 * made every signed-in page view (and every ?_rsc= hover-prefetch, sitemap,
 * robots, api call) pay a 100-300ms Supabase getUser() round trip.
 *
 * Why the narrow matcher is safe:
 *   - Every public page (/, /questions, /questions/[id], hubs, marketing) is
 *     cookieless server-side — they render from the anon client and never
 *     read the session (see CLAUDE.md "Supabase Client Rules").
 *   - The browser client (AuthContext) owns token freshness on the client:
 *     supabase-js auto-refreshes the cookie session as the user browses.
 *   - The only server-side session readers are /questions/[id]/preview (an
 *     RSC, which cannot write refreshed cookies itself — so it stays
 *     matched), /profile and /admin (gated below), and /auth/callback —
 *     deliberately UNMATCHED because it performs its own PKCE code exchange
 *     and cookie write.
 *
 * Why getUser() and not getSession()?
 *   getSession() reads the JWT from the cookie without validating it.
 *   getUser() sends the JWT to Supabase to validate it server-side, which
 *   prevents spoofed cookies from bypassing auth guards. The round trip is
 *   acceptable now that only protected routes pay it.
 *
 * Admin role check (is_admin column) is NOT done here — that requires a DB
 * query. Admin routes rely on the client-side AdminRoute component for role
 * enforcement; middleware only checks that the user is authenticated at all.
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware-client';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Uppercase-UUID question links are the same page under a duplicate URL.
  // Normalize to the canonical lowercase form here — a pure string check
  // (page-level permanentRedirect gets ISR-cached as a 308 WITHOUT a
  // Location header, which browsers cannot follow). These branches run
  // before and without any Supabase call, so public question/hub pages
  // still skip the auth round trip entirely; only the admin preview falls
  // through to the session logic below.
  const questionId = pathname.match(/^\/questions\/([^/]+)$/)?.[1];
  if (questionId) {
    if (questionId !== questionId.toLowerCase()) {
      const url = request.nextUrl.clone();
      url.pathname = `/questions/${questionId.toLowerCase()}`;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }
  if (pathname === '/questions' || (pathname.startsWith('/questions/') && !pathname.endsWith('/preview'))) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /profile — requires sign-in; preserve intended path for post-login redirect
  if (pathname.startsWith('/profile') && !user) {
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // /admin — requires sign-in (role check is done client-side by AdminRoute)
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // /auth — redirect away if already signed in, honouring a safe same-site
  // ?next= (e.g. /auth?next=/profile) instead of discarding it.
  if (pathname === '/auth' && user) {
    const next = request.nextUrl.searchParams.get('next');
    const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/questions';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  // '/questions/:path*' is matched for the lowercase-URL normalization and
  // the admin preview. A bare trailing-param matcher ('/questions/:id')
  // compiles to a broken regex in Next 14 (the param collides with the
  // internal .json data-route rewrite), so the whole subtree is matched and
  // public paths exit in code BEFORE any Supabase call — P8's "no auth
  // round trip on public pages" holds.
  matcher: ['/profile/:path*', '/admin/:path*', '/auth', '/questions/:path*'],
};
