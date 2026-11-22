import type { Metadata } from 'next';
import Link from 'next/link';
import CohortApplyForm from '@/components/cohort/CohortApplyForm';

/**
 * /cohort/apply — the cohort application ("lead") form. Static: the form is a
 * client component that posts to /api/cohort-applications. Kept out of the
 * index (noindex) — /cohort is the page that should rank; this is a step in it.
 */
export const metadata: Metadata = {
  title: 'Apply: AI Product Builder Cohort',
  description: 'Apply for the 12-week live AI Product Builder Cohort. Takes about 2 minutes.',
  alternates: { canonical: '/cohort/apply' },
  robots: { index: false, follow: true },
};

export default function CohortApplyPage() {
  return (
    <div className="container max-w-2xl py-10 md:py-14">
      <header className="space-y-3 mb-8">
        <Link href="/cohort" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to cohort details
        </Link>
        <h1 className="font-heading font-bold text-3xl md:text-4xl">
          Apply: AI Product Builder Cohort (12-week live)
        </h1>
        <p className="text-muted-foreground">
          Build real AI products and prepare for PM interviews. Read the{' '}
          <Link href="/cohort" className="underline hover:text-foreground">curriculum and programme details</Link>{' '}
          before you apply. Applying is free and does not commit you to anything; you only pay if
          you decide to join after we talk.
        </p>
      </header>
      <CohortApplyForm />
    </div>
  );
}
