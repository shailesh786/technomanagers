/**
 * Cancellation and Refund Policy page — static legal content.
 * No data fetching; rendered statically. Layout mirrors app/privacy/page.tsx.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: 'Cancellation and Refund Policy',
  description:
    'Get a full, no-questions-asked refund on your Technomanagers cohort by emailing us within 2 hours after your first live class ends.',
  alternates: { canonical: '/refund-policy' },
  openGraph: {
    title: 'Cancellation and Refund Policy',
    description:
      'Full, no-questions-asked refund if you email us within 2 hours after your first live class ends.',
    type: 'website',
    url: '/refund-policy',
  },
};

const LAST_UPDATED = 'August 19, 2026';
const CONTACT_EMAIL = 's.shailesh1995@gmail.com';

export default function RefundPolicy() {
  return (
    <div className="container max-w-3xl py-12 md:py-16">
      <header className="space-y-2 mb-10">
        <h1 className="font-heading font-bold text-3xl md:text-4xl">Cancellation and Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <p>
            TechnoManagers (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) runs live
            cohorts for product managers. If you join a cohort and decide after the first class that
            it is not right for you, you can cancel and get your full fee back. This page explains
            how. Please read it before you pay.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">1. When You Can Get a Refund</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Within 2 hours after your first class ends.</strong>{' '}
              Email us within 2 hours after the first live class of your cohort ends, and we will
              refund the full fee you paid.
            </li>
            <li>
              <strong className="text-foreground">No questions asked.</strong> You do not need to
              give a reason, and we will not ask for one.
            </li>
            <li>
              <strong className="text-foreground">Before the cohort starts.</strong> If you cancel
              before the first class, you also get a full refund.
            </li>
            <li>
              <strong className="text-foreground">How we count the 2 hours.</strong> We count from
              the scheduled end time of the first class, in Indian Standard Time (IST), and go by the
              time your email reaches us. For example, if your first class is scheduled to end at
              11:30 PM IST, your email must reach us by 1:30 AM IST.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">2. When You Cannot Get a Refund</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Once the 2 hours have passed, we cannot give a refund. This applies even if you have
              not attended any classes or used any of the materials.
            </li>
            <li>
              If you switch to a later cohort, the 2 hours are still counted from the first class of
              the cohort you originally joined. Switching does not give you a new refund window.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">3. How to Ask for a Refund</h2>
          <p>
            Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline hover:no-underline">
              {CONTACT_EMAIL}
            </a>{' '}
            with the subject &ldquo;Refund request&rdquo; and include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your full name</li>
            <li>The email address you used to enrol</li>
            <li>Your cohort (for example, Cohort 3 &ndash; Weekday)</li>
          </ul>
          <p>That is all we need. You do not have to tell us why you are cancelling.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">4. When You Will Get Your Money Back</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              We will confirm your refund and send the money back to the same payment method you
              used within 5&ndash;7 business days of your email. Your bank may take a few more days
              to show it.
            </li>
            <li>
              After we send the refund, you will no longer have access to the cohort&rsquo;s live
              classes, recordings, community, or materials.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">5. If We Cancel or Reschedule a Cohort</h2>
          <p>
            If we cancel a cohort, we will refund your full fee. If we change the start date, you can
            either join on the new date or get a full refund.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">6. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. When we do, we will change the &ldquo;Last
            updated&rdquo; date at the top of this page. The version that was live on the day you
            enrolled is the one that applies to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">7. Contact Us</h2>
          <p>
            If you have any questions about this policy, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline hover:no-underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-sm text-foreground underline hover:no-underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
