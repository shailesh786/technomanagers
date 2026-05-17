/**
 * app/layout.tsx — Root Layout
 *
 * Phase 1: Minimal shell — just renders children with the correct HTML structure,
 * global CSS, and font variables.
 *
 * Phase 4: This file will be updated to:
 *  - Import and render <Navbar /> and <Footer />
 *  - Wrap children in <AuthProvider>, <QueryClientProvider>, <ThemeProvider>
 *  - Add <Toaster /> and <Sonner /> from shadcn/ui
 *
 * Fonts are loaded via next/font/google (zero layout-shift, self-hosted by
 * Next.js — no external <link> tag needed).
 */

import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import '@src/index.css';

// ─── Font definitions ────────────────────────────────────────────────────────

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

// ─── Default metadata (overridden per-page via generateMetadata) ─────────────

export const metadata: Metadata = {
  title: {
    default: 'Technomanagers — Product Management Community',
    template: '%s | Technomanagers',
  },
  description:
    'Master product management with curated interview questions, 1:1 coaching, courses, and a community of PMs from top companies.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://technomanagers.com'
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
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Suppress hydration warning caused by next-themes injecting the theme
      // class before React hydrates.
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${dmSans.variable}`}
    >
      <body>
        {/*
         * Phase 4: Replace this comment block with:
         *
         * <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
         *   <QueryProvider>               ← TanStack Query provider
         *     <AuthProvider>             ← Supabase auth context
         *       <QuestionAccessProvider>
         *         <TooltipProvider>
         *           <Navbar />
         *           <main className="flex-1">{children}</main>
         *           <Footer />   ← rendered conditionally (not on /admin)
         *           <Toaster />
         *           <Sonner />
         *           <SignInGateModal />
         *         </TooltipProvider>
         *       </QuestionAccessProvider>
         *     </AuthProvider>
         *   </QueryProvider>
         * </ThemeProvider>
         */}
        {children}
      </body>
    </html>
  );
}
