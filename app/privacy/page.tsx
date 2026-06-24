/**
 * Privacy Policy page — static marketing/legal content.
 * No data fetching; rendered statically.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Technomanagers',
  description:
    'How Technomanagers collects, uses, and protects your personal information across our interview prep, coaching, courses, events, and cohort programmes.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy | Technomanagers',
    description:
      'How Technomanagers collects, uses, and protects your personal information.',
    type: 'website',
    url: '/privacy',
  },
};

const LAST_UPDATED = 'June 3, 2026';
const CONTACT_EMAIL = 'contact@technomanagers.com';

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-3xl py-12 md:py-16">
      <header className="space-y-2 mb-10">
        <h1 className="font-heading font-bold text-3xl md:text-4xl">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <p>
            TechnoManagers (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates a
            community platform for product managers offering interview question prep, coaching
            services, courses, events, and a cohort programme. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you use our website and
            services. By using TechnoManagers, you agree to the practices described below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Account information.</strong> When you sign in
              using Google OAuth, we receive your name, email address, and profile picture as
              provided by your authentication provider.
            </li>
            <li>
              <strong className="text-foreground">Profile data.</strong> Information you add to your
              profile and any content you create, such as saved questions, likes, and comments.
            </li>
            <li>
              <strong className="text-foreground">Usage data.</strong> Information about how you
              interact with the platform, including pages visited and features used, collected via
              analytics tools.
            </li>
            <li>
              <strong className="text-foreground">Technical data.</strong> Device, browser, and
              session information, including cookies used to keep you signed in.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our platform and services;</li>
            <li>Authenticate you and keep your session secure;</li>
            <li>Personalise your experience, including saved questions and content you engage with;</li>
            <li>Communicate with you about coaching, courses, events, and the cohort programme;</li>
            <li>Analyse usage to understand and improve performance;</li>
            <li>Comply with legal obligations and enforce our terms.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">3. Cookies and Tracking</h2>
          <p>
            We use cookies to keep you signed in and to maintain your authenticated session. We also
            use analytics services (such as Vercel Analytics and Speed Insights) to understand how
            the platform is used and to improve performance. You can control cookies through your
            browser settings, though disabling them may affect functionality such as staying signed
            in.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">4. How We Share Your Information</h2>
          <p>
            We do not sell your personal information. We may share information with trusted service
            providers who help us operate the platform, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Supabase</strong> — for database hosting and
              authentication;
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — for hosting and analytics;
            </li>
            <li>
              <strong className="text-foreground">Google</strong> — for OAuth sign-in.
            </li>
          </ul>
          <p>
            We may also disclose information if required by law or to protect the rights, property,
            or safety of TechnoManagers and our users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">5. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to
            provide our services. If you delete your account, we will remove or anonymise your
            personal information, except where retention is required to comply with legal
            obligations or resolve disputes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">6. Data Security</h2>
          <p>
            We implement reasonable technical and organisational measures to protect your
            information, including encrypted connections and secure cookie-based sessions. However,
            no method of transmission or storage is completely secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">7. Your Rights</h2>
          <p>
            Depending on your location, you may have the right to access, correct, update, or delete
            your personal information, as well as to object to or restrict certain processing. To
            exercise these rights, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline hover:no-underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">8. Children&rsquo;s Privacy</h2>
          <p>
            Our platform is intended for professionals and is not directed at children under 16. We
            do not knowingly collect personal information from children. If you believe a child has
            provided us with personal information, please contact us so we can remove it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review this
            policy periodically.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-xl text-foreground">10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, contact us at{' '}
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
