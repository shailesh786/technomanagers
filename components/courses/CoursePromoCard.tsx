/**
 * components/courses/CoursePromoCard.tsx — a compact link card to a course
 * page, shown on question pages and category hubs whose topic the course
 * covers (lib/course-pages.ts → coursePromoFor). The link text leads with
 * the course name, so it also tells crawlers what the course page is about.
 * Question pages no on-site course covers get an interview-prep course that
 * sells on Topmate instead (questionCoursePromo) — an external link.
 *
 * Plain presentational markup with no hooks, so both Server Components (hub
 * pages) and the client question page can render it.
 */

import Link from 'next/link';
import { ArrowRight, ExternalLink, GraduationCap } from 'lucide-react';
import type { CoursePromo } from '@/lib/course-pages';

export default function CoursePromoCard({ promo, eyebrow }: { promo: CoursePromo; eyebrow: string }) {
  const className =
    'group flex items-center gap-4 rounded-xl border bg-muted/60 p-4 transition-colors hover:border-secondary/40 hover:bg-muted';
  const body = (
    <>
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground" aria-hidden>
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{eyebrow}</span>
        <span className="font-heading text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-secondary">
          {promo.title}
        </span>
        <span className="text-sm leading-snug text-muted-foreground">
          {promo.pitch}
          {promo.proof && <> <span className="whitespace-nowrap">{promo.proof}</span></>}
        </span>
      </span>
      <span className="hidden flex-none items-center gap-1 text-sm font-medium text-secondary sm:inline-flex">
        View course{' '}
        {promo.external ? (
          <ExternalLink className="h-4 w-4" aria-hidden />
        ) : (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        )}
      </span>
    </>
  );

  // Topmate-only courses open in a new tab, like the course cards on /courses.
  return promo.external ? (
    <a href={promo.href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={promo.href} className={className}>
      {body}
    </Link>
  );
}
