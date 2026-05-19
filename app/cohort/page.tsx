/**
 * app/cohort/page.tsx — Cohort programme page (Server Component, Phase 4)
 *
 * CohortPage is entirely static content (hero, curriculum, testimonials)
 * plus a client-side waitlist form that posts directly to Supabase.
 * No server-side data prefetch is needed — metadata is the only addition.
 */

import type { Metadata } from 'next';
import CohortPage from '@/components/cohort/CohortPage';

export const metadata: Metadata = {
  title: 'PM Cohort Programme | Technomanagers',
  description:
    'Join our structured cohort programme to go from aspiring PM to offer in hand — live sessions, peer groups, and expert mentorship.',
  openGraph: {
    title: 'PM Cohort Programme | Technomanagers',
    description:
      'Structured cohort programme with live sessions, peer groups, and expert PM mentorship.',
    type: 'website',
  },
};

export default function Cohort() {
  return <CohortPage />;
}
