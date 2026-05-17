/**
 * app/profile/page.tsx — User profile  (/profile)
 *
 * Rendering: CSR (Client Component)
 * 'use client' required because this page reads auth state from context
 * and renders personalised content.
 *
 * Phase 3: Replace this stub with the migrated <Profile /> component.
 * Route protection (redirect to /auth if not signed in) will be handled
 * via middleware.ts in Phase 3.
 */

'use client';

export default function ProfilePage() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-heading font-bold">
        🚧 Profile — Phase 3 migration pending
      </h1>
      <p className="mt-4 text-muted-foreground">
        This page will be migrated in Phase 3.
      </p>
    </div>
  );
}
