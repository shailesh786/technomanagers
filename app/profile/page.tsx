/**
 * app/profile/page.tsx — Profile page (Server Component shell)
 *
 * ProfilePage is a client component because it uses useSearchParams,
 * useRouter, TanStack Query hooks, and auth context.
 * Wrapped in Suspense since ProfilePage uses useSearchParams().
 */

import { Suspense } from 'react';
import ProfilePage from '@/components/profile/ProfilePage';

export default function Profile() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-muted-foreground">Loading...</div>}>
      <ProfilePage />
    </Suspense>
  );
}
