/**
 * Cohort programme page — static content with a client-side waitlist form.
 * No server prefetch needed.
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
