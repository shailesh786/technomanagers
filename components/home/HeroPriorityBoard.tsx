'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// (React 18 batches scroll-handler state updates and bails out when the value
// is unchanged, so the onScroll handler below needs no manual throttling.)
import { cn } from '@/lib/utils';
import HeroCard from '@/components/home/HeroCard';
import type { HeroItem } from '@/types';

/**
 * Homepage Hero Priority Board.
 *
 * Desktop (md+): all cards side by side in a static 3-column grid — no
 * rotation, arrows, dots or autoplay (explicit product decision).
 * Mobile: the same cards as a one-up manual slideshow — native horizontal
 * scroll-snap with a peek of the next card, dot indicators and a counter.
 *
 * Renders nothing at all when no items are visible — no empty state.
 */
export default function HeroPriorityBoard({ items }: { items: HeroItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track left padding — cards snap to this inset (scroll-padding-left).
  const TRACK_INSET = 20;

  /** Derive the active dot from the scroll position. */
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    let nearest = 0;
    let nearestDist = Infinity;
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - TRACK_INSET - track.scrollLeft);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement | undefined;
    if (!card) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: card.offsetLeft - TRACK_INSET,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, []);

  // Reset to the first card whenever the item list changes.
  const itemsKey = items.map((i) => i.id).join(',');
  useEffect(() => {
    setActiveIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [itemsKey]);

  if (items.length === 0) return null;

  const clampedIndex = Math.min(activeIndex, items.length - 1);

  return (
    <section aria-label="Start here" className="bg-muted">
      <div className="pb-[30px] pt-[26px] md:container md:pb-12 md:pt-[52px]">
        {/* Header row */}
        <div className="mb-4 flex items-baseline justify-between px-5 md:mb-7 md:px-0">
          <h1 className="font-heading text-[22px] font-bold tracking-[-0.02em] text-foreground md:text-[32px] md:tracking-[-0.022em]">
            Start here.
          </h1>
          <span className="hidden font-body text-sm text-muted-foreground md:inline">
            Three things worth your next hour
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/70 md:hidden"
          >
            {clampedIndex + 1} / {items.length}
          </span>
        </div>

        {/* Desktop — static three-up grid. Fewer than three items simply
            render fewer cards; the columns don't stretch. */}
        <div className="hidden grid-cols-3 gap-[22px] md:grid">
          {items.map((item) => (
            <HeroCard key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile — one-up manual slideshow: native scroll-snap, next-card
            peek via the asymmetric right bleed. No autoplay. */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && clampedIndex < items.length - 1) {
              e.preventDefault();
              scrollToIndex(clampedIndex + 1);
            } else if (e.key === 'ArrowLeft' && clampedIndex > 0) {
              e.preventDefault();
              scrollToIndex(clampedIndex - 1);
            }
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Start here — ${items.length} item${items.length === 1 ? '' : 's'}`}
          className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 [scroll-padding-left:20px] scrollbar-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
        >
          {items.map((item) => (
            <HeroCard
              key={item.id}
              item={item}
              className="w-[calc(100vw-86px)] flex-none snap-start"
            />
          ))}
        </div>

        {/* Dot indicators — mobile only, derived from scroll position */}
        {items.length > 1 && (
          <div className="mt-5 flex items-center justify-center gap-[9px] md:hidden">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to item ${i + 1} of ${items.length}`}
                aria-current={i === clampedIndex}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300 motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  i === clampedIndex ? 'w-7 bg-primary' : 'w-2 bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
