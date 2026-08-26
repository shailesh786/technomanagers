/**
 * app/layout.tsx — Root Layout (Server Component)
 *
 * Wraps every page with:
 *   QueryProvider → AuthProvider → QuestionAccessProvider → TooltipProvider
 *   Navbar · <main> · FooterWrapper (hidden on /admin)
 *   Toaster (shadcn) · Sonner · SignInGateModal
 *
 * Fonts are loaded via next/font/google — zero layout-shift, self-hosted
 * by Next.js at build time, no external <link> tag needed.
 */

import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import QueryProvider from '@/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { QuestionAccessProvider } from '@/contexts/QuestionAccessContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import Navbar from '@/components/layout/Navbar';
import FooterWrapper from '@/components/layout/FooterWrapper';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import SignInGateModal from '@/components/questions/SignInGateModal';
// ⚠️ Use the /react variants, NOT /next. The /next variants call
// useSearchParams() internally, which throws BAILOUT_TO_CLIENT_SIDE_RENDERING
// during static generation. That abort RACES the streaming render of the page:
// on slower pages (/questions with 20 cards) the main content sometimes lost
// the race and the prerendered HTML shipped an EMPTY <main> — zero crawlable
// content, non-deterministically per build. The /react variants track page
// views without useSearchParams (raw paths instead of route patterns).
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';
import { getHubTaxonomy } from '@/lib/hub-data';
import type { NavHubs } from '@/components/layout/NavDropdown';
import '@/app/globals.css';

// ─── Fonts ───────────────────────────────────────────────────────────────────
//
// Weight strategy — why we restrict instead of loading the variable font:
//
//   Variable font (all weights) = one 36 KB file for Plus Jakarta Sans.
//   Specific weights            = three ~9 KB files (600, 700, 800).
//
// Both approaches use font-display: swap so text paints with a fallback font
// immediately — fonts never block FCP. However, Chrome UPDATES LCP when the
// real font swaps in. With a 36 KB variable font, the swap happens ~3× later
// than with a 9 KB weight file. Naming the exact weights we use (600 semibold,
// 700 bold, 800 extrabold) makes the hero h1 swap in ~4× faster → lower LCP.
//
// DM Sans (body) stays as a variable font because body text uses the full
// weight range (400 → 700 via font-medium, font-semibold, font-bold) and the
// body font is NOT the LCP candidate, so its file size is less critical.

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  // Only the heading weights we actually use: semibold (600), bold (700),
  // extrabold (800). Each is a ~9 KB subset vs. a 36 KB variable font.
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  // Variable font: covers 400–700 naturally; body text isn't the LCP element.
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  // Tag chips, eyebrows and counters only — three small weight subsets, never
  // an LCP candidate. 500 (captions), 600 (labels), 700 (tag chips).
  weight: ['500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

// ─── Default metadata (each SSR page overrides via generateMetadata) ─────────

export const metadata: Metadata = {
  title: {
    default: 'Technomanagers — Product Management Community',
    template: '%s | Technomanagers',
  },
  description:
    'Master product management with curated interview questions, 1:1 coaching, courses, and a community of PMs from top companies.',
  metadataBase: new URL(
    (() => {
      const u = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.technomanagers.in';
      return /^https?:\/\//i.test(u) ? u : `https://${u}`;
    })(),
  ),
  openGraph: {
    type: 'website',
    siteName: 'Technomanagers',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@technomanagers',
  },
  robots: { index: true, follow: true },
  icons: {
    // `icon` generates <link rel="icon"> — the correct, non-deprecated tag.
    // app/favicon.ico is served at /favicon.ico by Next.js but does NOT
    // auto-inject the <link> tag; it must be declared here explicitly.
    // Do NOT use `shortcut` — it emits the deprecated rel="shortcut icon"
    // which modern browsers ignore.
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// ─── Site identity (Organization + WebSite JSON-LD) ─────────────────────────
// The entity graph Google reads to connect every page to the brand: name,
// logo, official profiles (sameAs) and founder. Page-level JSON-LD (questions,
// cohort, hubs) reference the same publisher by name; this is the one place
// the entity itself is declared.

const SITE_URL = resolveSiteUrl();
const identityJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#org`,
      name: 'Technomanagers',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.webp`,
      sameAs: ['https://www.youtube.com/@technomanagers', 'https://topmate.io/technomanagers'],
      founder: {
        '@type': 'Person',
        name: 'Shailesh Sharma',
        sameAs: ['https://www.linkedin.com/in/shailesh-sharma/'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      url: SITE_URL,
      name: 'Technomanagers',
      publisher: { '@id': `${SITE_URL}#org` },
    },
  ],
};

// ─── Layout ──────────────────────────────────────────────────────────────────

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Hub names for the Questions nav menu — served in every page's HTML so
  // crawlers can reach the hub pages from anywhere. getHubTaxonomy is
  // unstable_cache'd (tag 'questions') and throws on a DB error, which is
  // correct here: fail the render loudly rather than ship a linkless nav.
  const taxonomy = await getHubTaxonomy();
  const navHubs: NavHubs = {
    roles: taxonomy.role.map(({ name }) => name),
    categories: taxonomy.category.slice(0, 12).map(({ name }) => name),
    companies: taxonomy.company.slice(0, 8).map(({ name }) => name),
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex flex-col min-h-screen">
        {/* Keyboard/screen-reader users can jump past the navbar. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(identityJsonLd) }}
        />
        <QueryProvider>
          <AuthProvider>
            <QuestionAccessProvider>
              <TooltipProvider>
                <Navbar hubs={navHubs} />
                <main id="main" className="flex-1">{children}</main>
                <FooterWrapper />
                <Toaster />
                <Sonner />
                <SignInGateModal />
              </TooltipProvider>
            </QuestionAccessProvider>
          </AuthProvider>
        </QueryProvider>
        {/* Vercel Analytics + Speed Insights — outside providers, no React context needed */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
