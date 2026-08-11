/**
 * app/profile/page.tsx — Profile page (Server Component shell)
 *
 * ProfilePage is a client component because it uses useSearchParams,
 * useRouter, TanStack Query hooks, and auth context.
 * Wrapped in Suspense since ProfilePage uses useSearchParams().
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProfilePage from '@/components/profile/ProfilePage';

// Personalised, auth-gated page — no SEO value. Keep it out of Google's index
// so it can't be flagged as thin/duplicate content in Search Console.
export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function Profile() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-muted-foreground">Loading...</div>}>
      <ProfilePage />
    </Suspense>
  );
}
