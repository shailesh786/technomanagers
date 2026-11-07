/**
 * components/courses/CoursePromoCard.tsx — a compact link card to a course
 * page, shown on question pages and category hubs whose topic the course
 * covers (lib/course-pages.ts → coursePromoFor). The link text leads with
 * the course name, so it also tells crawlers what the course page is about.
 *
 * Plain presentational markup with no hooks, so both Server Components (hub
 * pages) and the client question page can render it.
 */

import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import type { CoursePromo } from '@/lib/course-pages';

export default function CoursePromoCard({ promo, eyebrow }: { promo: CoursePromo; eyebrow: string }) {
  return (
    <Link
      href={promo.href}
      className="group flex items-center gap-4 rounded-xl border bg-muted/60 p-4 transition-colors hover:border-secondary/40 hover:bg-muted"
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground" aria-hidden>
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{eyebrow}</span>
        <span className="font-heading text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-secondary">
          {promo.title}
        </span>
        <span className="text-sm leading-snug text-muted-foreground">
          {promo.pitch} <span className="whitespace-nowrap">{promo.proof}</span>
        </span>
      </span>
      <span className="hidden flex-none items-center gap-1 text-sm font-medium text-secondary sm:inline-flex">
        View course <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
