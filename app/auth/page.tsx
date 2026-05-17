/**
 * app/auth/page.tsx — Authentication  (/auth)
 *
 * Rendering: CSR (Client Component)
 * 'use client' required because this page renders the OAuth sign-in flow,
 * which calls browser APIs and Supabase client-side methods.
 *
 * Phase 3: Replace this stub with the migrated <Auth /> component.
 * The page will call:
 *   supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })
 * instead of the removed lovable.auth.signInWithOAuth().
 *
 * The /auth/callback Route Handler (app/auth/callback/route.ts) will be
 * created in Phase 3 to exchange the PKCE code for a session.
 */

'use client';

export default function AuthPage() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-heading font-bold">
        🚧 Auth — Phase 3 migration pending
      </h1>
      <p className="mt-4 text-muted-foreground">
        Lovable auth will be replaced with native Supabase OAuth in Phase 3.
      </p>
    </div>
  );
}
