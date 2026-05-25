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
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import QueryProvider from '@/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { QuestionAccessProvider } from '@/contexts/QuestionAccessContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import Navbar from '@/components/layout/Navbar';
import FooterWrapper from '@/components/layout/FooterWrapper';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import SignInGateModal from '@/components/questions/SignInGateModal';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/app/globals.css';

// ─── Fonts ───────────────────────────────────────────────────────────────────

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
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
      const u = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://technomanagers.com';
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
};

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${dmSans.variable}`}
    >
      <body className="flex flex-col min-h-screen">
        <QueryProvider>
          <AuthProvider>
            <QuestionAccessProvider>
              <TooltipProvider>
                <Navbar />
                <main className="flex-1">{children}</main>
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
