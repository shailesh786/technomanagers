/**
 * app/auth/layout.tsx — metadata wrapper for the /auth route
 *
 * The sign-in page itself is a 'use client' component, which cannot export
 * metadata. This layout exists solely to mark /auth as noindex: it is a
 * utility page with no SEO value, and without this it inherits the root
 * layout's `index, follow` and gets flagged as thin/duplicate content in
 * Search Console. (Route handlers like callback/route.ts are unaffected.)
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
