'use client';

/**
 * components/layout/FooterWrapper.tsx  —  Client Component
 *
 * Hides the Footer on /admin routes, matching the original Vite App.tsx
 * behaviour: `{!isAdminRoute && <Footer />}`.
 * usePathname() requires 'use client', so this thin wrapper keeps the
 * Footer component itself a pure Server Component.
 */

import { usePathname } from 'next/navigation';
import Footer from '@/components/layout/Footer';

export default function FooterWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <Footer />;
}
