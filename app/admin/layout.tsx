/**
 * app/admin/layout.tsx — metadata wrapper for /admin/*
 *
 * The admin panel is a 'use client' component, which cannot export metadata.
 * This layout exists solely to mark all /admin routes as noindex — the panel
 * is auth-gated and has zero SEO value.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
