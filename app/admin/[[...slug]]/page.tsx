/**
 * app/admin/[[...slug]]/page.tsx — Admin panel  (/admin/*)
 *
 * Rendering: CSR (Client Component)
 * 'use client' required because the admin panel uses heavy client-side
 * interactions (tables, modals, image uploads).
 *
 * The [[...slug]] catch-all segment handles all /admin/* sub-routes
 * (e.g. /admin/questions, /admin/coaching, /admin/moderation).
 *
 * Phase 3: Replace this stub with the migrated <Admin /> component.
 * Route protection (admin-only guard) will be enforced via middleware.ts.
 */

'use client';

export default function AdminPage() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-heading font-bold">
        🚧 Admin — Phase 3 migration pending
      </h1>
      <p className="mt-4 text-muted-foreground">
        This page will be migrated in Phase 3.
      </p>
    </div>
  );
}
