'use client';

/**
 * components/courses/CourseOfferBox.tsx — the limited-time coupon in a course
 * page's enroll card: the code with a Copy button and a countdown to the
 * offer's fixed end time. The visitor applies the code on Topmate.
 *
 * The countdown renders "--" on the server and first client paint (the page
 * is ISR, so the server time is stale and would mismatch on hydration), then
 * ticks every second. Once the end time passes the box removes itself.
 */

import { useEffect, useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCountdown } from '@/hooks/useCountdown';
import type { CourseOffer } from '@/lib/course-pages';

const UNITS = ['days', 'hrs', 'min', 'sec'] as const;

export default function CourseOfferBox({ offer }: { offer: CourseOffer }) {
  const { parts, ended } = useCountdown(offer.endsAt);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  if (ended) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
    } catch {
      // Clipboard blocked (e.g. insecure context) — the code stays visible to copy by hand.
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border-[1.5px] border-dashed border-secondary/60 bg-muted p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Clock className="h-4 w-4 flex-none text-secondary" aria-hidden />
        {offer.label}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-background py-2.5 pl-4 pr-2.5">
        <span className="font-heading text-xl font-extrabold tracking-[0.08em]">{offer.code}</span>
        <Button type="button" variant="outline" size="sm" onClick={copy} aria-label={`Copy code ${offer.code}`}>
          {copied ? (
            <>
              <Check /> Copied
            </>
          ) : (
            'Copy'
          )}
        </Button>
      </div>
      <div className="grid gap-1.5">
        <span className="text-[13px] text-muted-foreground">Offer ends in</span>
        <div className="grid grid-cols-4 gap-2" role="timer" aria-live="off">
          {UNITS.map((label, i) => (
            <div key={label} className="grid rounded-lg bg-primary py-2 text-center text-primary-foreground">
              <span className="font-heading text-xl font-bold leading-tight tabular-nums">
                {parts ? String(parts[i]).padStart(2, '0') : '--'}
              </span>
              <span className="text-[11px] opacity-80">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[13px] leading-[1.5] text-muted-foreground">Copy the code and apply it at checkout on Topmate.</p>
    </div>
  );
}
