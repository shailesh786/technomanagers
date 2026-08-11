/**
 * Cohort programme page — static content with a client-side waitlist form.
 * No server prefetch needed.
 */

import type { Metadata } from 'next';
import CohortPage from '@/components/cohort/CohortPage';

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: 'AI Product Builder Cohort',
  description:
    'A 12-week mentor-led live cohort to become a job-ready AI Product Manager. Build RAG systems, AI agents, run evals, prep for interviews, and present on Demo Day.',
  alternates: { canonical: '/cohort' },
  openGraph: {
    title: 'AI Product Builder Cohort | Technomanagers',
    description:
      '12-week live cohort: RAG prototypes, AI agents, evals, interview prep, and a live Demo Day. Become a job-ready AI PM.',
    type: 'website',
    url: '/cohort',
  },
};

export default function Cohort() {
  return <CohortPage />;
}
