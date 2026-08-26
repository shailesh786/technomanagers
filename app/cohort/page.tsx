/**
 * Cohort programme page (Server Component)
 *
 * Static content plus an admin-managed testimonial wall. The testimonials are
 * fetched here rather than in the client component so the quotes, names and
 * outcomes land in the initial HTML — they are some of the most crawlable
 * copy on the page — and so the wall paints with no client-side data waterfall.
 *
 * ISR: the page is statically generated and rebuilt in the background every
 * 5 minutes. The Supabase read is additionally wrapped in unstable_cache with
 * the 'cohort-testimonials' tag, so admin edits flush it immediately via
 * POST /api/revalidate/cohort instead of waiting out the window.
 */

import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import CohortPage from '@/components/cohort/CohortPage';
import {
  INSTRUCTOR_LINKEDIN_URL,
  INSTRUCTOR_NAME,
  INSTRUCTOR_PORTRAIT_URL,
  INSTRUCTOR_YOUTUBE_URL,
} from '@/components/cohort/InstructorCard';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { TESTIMONIAL_COLUMNS } from '@/lib/cohort-testimonials';
import type { CohortTestimonial } from '@/types';

export const revalidate = 300;

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: 'AI Product Builder Cohort',
  description:
    'A 12-week mentor-led live cohort to become a job-ready AI Product Manager. Build RAG systems, AI agents, run evals, prep for interviews, and present on Demo Day.',
  alternates: { canonical: '/cohort' },
  openGraph: {
    title: 'AI Product Builder Cohort',
    description:
      '12-week live cohort: RAG prototypes, AI agents, evals, interview prep, and a live Demo Day. Become a job-ready AI PM.',
    type: 'website',
    url: '/cohort',
  },
};

const getCohortTestimonials = unstable_cache(
  async (): Promise<CohortTestimonial[]> => {
    // Cookieless client — mandatory inside unstable_cache and for keeping this
    // route statically rendered. Visible rows are public to anon via RLS.
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('cohort_testimonials')
      .select(TESTIMONIAL_COLUMNS)
      .eq('visible', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    // Swallow the error so a missing table (before the migration is applied)
    // just hides the section rather than failing the whole page build.
    if (error) return [];
    return (data ?? []) as unknown as CohortTestimonial[];
  },
  ['cohort-testimonials'],
  { revalidate: 300, tags: ['cohort-testimonials'] },
);

// Same normalisation app/sitemap.ts and app/layout.tsx use — the env var may
// arrive bare (technomanagers.in) or with a trailing slash.
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.technomanagers.in';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/**
 * schema.org markup for the programme.
 *
 * Emitted from the Server Component so it ships in the static HTML and adds
 * nothing to the client bundle.
 *
 * Deliberately no `review`/`aggregateRating` markup: we collect written
 * testimonials, not star ratings, and once multiple reviews are marked up
 * Google requires an aggregateRating — Search Console flags the combination
 * as a critical Review-snippets issue (seen Aug 2026). Unrated reviews can
 * never produce the review-snippet rich result anyway, so the markup bought
 * nothing; the quotes still reach crawlers as visible page content rendered
 * by CohortPage. Truthful star ratings collected from students are the only
 * legitimate way back to review markup here.
 */
function courseJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'AI Product Builder Cohort',
    description:
      'A 12-week mentor-led live cohort to become a job-ready AI Product Manager. Build RAG systems, AI agents, run evals, prep for interviews, and present on Demo Day.',
    url: `${siteUrl}/cohort`,
    image: INSTRUCTOR_PORTRAIT_URL,
    provider: {
      '@type': 'Organization',
      name: 'Technomanagers',
      url: siteUrl,
    },
    inLanguage: 'en',
    teaches: [
      'AI Product Management',
      'Retrieval-Augmented Generation (RAG)',
      'AI agents',
      'Model evaluation',
      'AI product go-to-market',
    ],
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'P8H',      // 8 hours per week, ISO 8601 duration
      courseSchedule: {
        '@type': 'Schedule',
        duration: 'P12W',
        repeatFrequency: 'Weekly',
        byDay: ['https://schema.org/Saturday', 'https://schema.org/Sunday'],
      },
      instructor: {
        '@type': 'Person',
        name: INSTRUCTOR_NAME,
        image: INSTRUCTOR_PORTRAIT_URL,
        sameAs: [INSTRUCTOR_YOUTUBE_URL, INSTRUCTOR_LINKEDIN_URL],
      },
    },
    // No `offers`: pricing is deliberately not public (owner decision,
    // Aug 26 2026) — structured data must not carry a price the page
    // doesn't display. Add an Offer here if that ever changes.
  };
}

export default async function Cohort() {
  const testimonials = await getCohortTestimonials();
  const siteUrl = resolveSiteUrl();

  return (
    <>
      <script
        type="application/ld+json"
        // Static course facts only — no user or database content.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(courseJsonLd(siteUrl)).replace(/</g, '\\u003c'),
        }}
      />
      <CohortPage testimonials={testimonials} />
    </>
  );
}
