'use client';

/**
 * components/courses/CourseOfferBar.tsx — full-width strip at the top of a
 * course page while its offer runs: the discount, the code and a live
 * countdown to the offer's fixed end time, linking to checkout. Removes
 * itself once the offer ends.
 */

import { ArrowRight } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import type { CourseOffer } from '@/lib/course-pages';

const pad = (n: number) => String(n).padStart(2, '0');

export default function CourseOfferBar({ offer, checkoutUrl }: { offer: CourseOffer; checkoutUrl: string }) {
  const { parts, ended } = useCountdown(offer.endsAt);
  if (ended) return null;
  const clock = parts ? `${parts[0]}d ${pad(parts[1])}:${pad(parts[2])}:${pad(parts[3])}` : '--d --:--:--';

  return (
    <a
      href={checkoutUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-gradient-brand text-primary-foreground"
    >
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-2.5 text-center text-sm min-[1072px]:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          {offer.label}: use code <span className="font-heading font-extrabold tracking-[0.06em]">{offer.code}</span>
        </span>
        <span className="rounded-full bg-primary px-3 py-1 font-heading text-[13px] font-bold tabular-nums">
          {clock} left
        </span>
        <span className="hidden items-center gap-1 font-medium underline-offset-4 group-hover:underline min-[640px]:inline-flex">
          Enroll now <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </a>
  );
}
