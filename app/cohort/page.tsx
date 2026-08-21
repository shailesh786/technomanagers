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
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { TESTIMONIAL_COLUMNS, isRenderable, selectVisibleTestimonials } from '@/lib/cohort-testimonials';
import type { CohortTestimonial } from '@/types';

export const revalidate = 300;

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
 * schema.org markup for the programme and its reviews.
 *
 * Emitted from the Server Component so it ships in the static HTML and adds
 * nothing to the client bundle.
 *
 * Deliberately no `aggregateRating`: we collect written testimonials, not star
 * ratings, and inventing a score to win a rich result would be fabricating
 * data. Reviews are emitted without `reviewRating` for the same reason — that
 * costs the review-snippet rich result but keeps the markup truthful, and the
 * Course entity itself is the bulk of the SEO value here.
 *
 * Only `text` testimonials become reviews: screenshots have no machine-readable
 * body, and a video's pull-quote is a fragment rather than a review.
 */
/**
 * Structured data is bytes in the HTML of every request, and long quotes add
 * up fast. Twenty reviews is well past the point of diminishing returns for
 * search engines while keeping the block to a few kB; the wall itself still
 * renders every published testimonial.
 */
const MAX_JSONLD_REVIEWS = 20;

function courseJsonLd(testimonials: CohortTestimonial[], siteUrl: string) {
  const reviews = selectVisibleTestimonials(testimonials)
    .filter((t) => t.kind === 'text' && isRenderable(t) && t.name.trim())
    .slice(0, MAX_JSONLD_REVIEWS)
    .map((t) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: t.name,
        ...(t.role.trim() ? { jobTitle: t.role } : {}),
      },
      reviewBody: t.quote,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'AI Product Builder Cohort',
    description:
      'A 12-week mentor-led live cohort to become a job-ready AI Product Manager. Build RAG systems, AI agents, run evals, prep for interviews, and present on Demo Day.',
    url: `${siteUrl}/cohort`,
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
    },
    ...(reviews.length ? { review: reviews } : {}),
  };
}

export default async function Cohort() {
  const testimonials = await getCohortTestimonials();
  const siteUrl = resolveSiteUrl();

  return (
    <>
      <script
        type="application/ld+json"
        // Server-rendered from our own database rows, never user input.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(courseJsonLd(testimonials, siteUrl)).replace(/</g, '\\u003c'),
        }}
      />
      <CohortPage testimonials={testimonials} />
    </>
  );
}
