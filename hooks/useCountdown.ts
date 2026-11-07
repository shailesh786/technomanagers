'use client';

/**
 * hooks/useCountdown.ts — ticking countdown to a fixed end time, shared by
 * the course page's offer box and offer bar.
 *
 * Returns null until mounted: the pages are ISR, so a server-rendered time
 * would be stale and mismatch on hydration — callers render "--" until then.
 */

import { useEffect, useState } from 'react';

const UNIT_MS = [86_400_000, 3_600_000, 60_000, 1_000] as const;

/** [days, hours, minutes, seconds] left until `endsAtMs`, never negative. */
export function timeLeft(endsAtMs: number, nowMs: number): number[] {
  let rest = Math.max(0, endsAtMs - nowMs);
  return UNIT_MS.map((ms) => {
    const n = Math.floor(rest / ms);
    rest -= n * ms;
    return n;
  });
}

export function useCountdown(endsAtIso: string): { parts: number[] | null; ended: boolean } {
  const endsAt = Date.parse(endsAtIso);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return { parts: null, ended: false };
  return { parts: timeLeft(endsAt, now), ended: now >= endsAt };
}
