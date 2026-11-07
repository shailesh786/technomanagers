'use client';

/**
 * components/courses/CourseProofToast.tsx — the small bottom-left pop-up on
 * a course page that cycles through the course's proof points, with a
 * pulsing icon to catch the eye. Desktop only (mobile already has the sticky
 * enroll bar at the bottom).
 *
 * Every line must be true and checkable — real enrolment, rating and
 * placement facts from lib/course-pages.ts. No invented "N people bought
 * this today" counters.
 *
 * Appears a few seconds after load; closing it keeps it closed for the rest
 * of the visit (sessionStorage, best-effort — it simply reappears if storage
 * is blocked).
 */

import { useEffect, useState } from 'react';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseProofPoint } from '@/lib/course-pages';

const SHOW_AFTER_MS = 5_000;
const ROTATE_MS = 6_000;
const DISMISS_KEY = 'tm-course-proof-dismissed';

export default function CourseProofToast({ points }: { points: CourseProofPoint[] }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // storage blocked — show it anyway
    }
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const rotate = setInterval(() => setIndex((i) => (i + 1) % points.length), ROTATE_MS);
    return () => {
      clearTimeout(show);
      clearInterval(rotate);
    };
  }, [points.length]);

  const close = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const point = points[index];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-6 left-6 z-40 hidden w-[340px] items-center gap-4 rounded-2xl border bg-background p-4 pr-9 shadow-lg transition-all duration-300 min-[1072px]:flex',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <span className="relative flex h-12 w-12 flex-none items-center justify-center" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-40 motion-safe:animate-ping" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary-foreground">
          <Users className="h-5 w-5" />
        </span>
      </span>
      <p key={index} className="text-sm leading-[1.45] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
        <strong className="font-semibold text-secondary">{point.strong}</strong> {point.rest}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-2.5 top-2.5 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
