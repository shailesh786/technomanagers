/**
 * app/auth/callback/route.ts — Supabase OAuth Callback Route Handler
 *
 * This Route Handler receives the PKCE authorization code from Supabase after
 * a successful Google OAuth sign-in and exchanges it for a session cookie.
 *
 * Flow:
 *  1. User clicks "Sign in with Google" → browser redirects to Google
 *  2. Google redirects back to: /auth/callback?code=<PKCE_CODE>
 *  3. This handler calls exchangeCodeForSession() → sets the session cookie
 *  4. Browser is redirected to the intended destination (default: home)
 *
 * Phase 3: This handler is a stub. It will be fully wired in Phase 3 when
 * the Auth page is migrated and Lovable auth is removed.
 *
 * ⚠️  Before Phase 3: Add this URL to Supabase Dashboard:
 *     Authentication → URL Configuration → Redirect URLs
 *     https://yourdomain.com/auth/callback
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 'next' param lets us redirect to the page the user was trying to access.
  // Only allow relative paths that start with '/' and not '//' (protocol-relative
  // URLs) to prevent open-redirect attacks.
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to auth page with an error flag
  return NextResponse.redirect(`${origin}/auth?error=callback_error`);
}
