'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const ROLES = [
  { article: 'an', label: 'AI Product Manager' },
  { article: 'a', label: 'Program Manager' },
  { article: 'a', label: 'Management Consultant' },
  { article: 'a', label: 'Category Manager' },
  { article: 'a', label: 'BizOps & Strategy Lead' },
] as const;

const INTERVAL_MS = 3200;

/**
 * The homepage h1. "Land Your Dream Job as" with a role line underneath that
 * cycles every 3.2 s: the old role drifts down and blurs out, the new one drops
 * in from above, then the marker (.tm-role-marker in globals.css) draws behind
 * it. Every role sits in the same grid cell and stays laid out (the inactive
 * ones are just transparent), so the box is always as tall as the tallest role
 * at the current width — nothing below shifts as the roles change, even when
 * the longest role wraps on a small phone.
 *
 * The h1's text is exactly one sentence (visible lead-in + sr-only roles), so
 * crawlers and screen readers get it once. The animated role box sits outside
 * the h1 and is aria-hidden. Rotation pauses off-screen and in background
 * tabs; reduced motion holds the first role with the marker drawn.
 *
 * Sizes: 36px mobile (32px under 360px wide), 48px tablet (md) so
 * the longest role fits on one line inside the container, 60px
 * from lg.
 */
export function RotatingRoleHeadline({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setIndex(0);
      return;
    }
    if (!inView) return;
    const id = window.setInterval(() => {
      if (document.hidden) return; // don't advance in a background tab
      setIndex((i) => (i + 1) % ROLES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, inView]);

  const prev = (index + ROLES.length - 1) % ROLES.length;

  return (
    <div
      ref={rootRef}
      className={cn(
        'w-full font-heading font-extrabold tracking-[-0.02em] text-foreground',
        'text-[36px] leading-[42px] max-[359px]:text-[32px] max-[359px]:leading-[38px] md:text-[48px] md:leading-[52px] lg:text-[60px] lg:leading-[63px]',
        className,
      )}
    >
      <h1>
        <span className="block">Land Your Dream Job as</span>
        <span className="sr-only">
          {' an AI Product Manager, a Program Manager, a Management Consultant, a Category Manager or a BizOps & Strategy Lead'}
        </span>
      </h1>

      <div aria-hidden="true" className="grid min-h-[92px] place-items-center md:min-h-20">
        {ROLES.map((role, k) => {
          const state = k === index ? 'current' : k === prev ? 'previous' : 'next';
          return (
            <span
              key={role.label}
              className={cn(
                '[grid-area:1/1]',
                'transition-[transform,opacity,filter] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                'motion-reduce:transition-none',
                state === 'current' && 'translate-y-0 opacity-100 blur-0',
                state === 'previous' &&
                  'translate-y-[18px] opacity-0 blur-[6px] md:translate-y-[22px] md:blur-[8px]',
                state === 'next' &&
                  '-translate-y-[18px] opacity-0 blur-[6px] md:-translate-y-[22px] md:blur-[8px]',
              )}
            >
              <span className="block md:whitespace-nowrap">
                <span className="mr-[0.25em]">{role.article}</span>
                <span
                  className="tm-role-marker rounded px-1 md:rounded-md md:px-1.5"
                  data-active={state === 'current'}
                >
                  {role.label}
                </span>
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
