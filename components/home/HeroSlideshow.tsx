'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HeroSlide } from '@/types';

/**
 * The hardcoded fallback slide. Rendered when the admin has not configured any
 * active hero slides. Matches the original homepage banner exactly.
 */
const FALLBACK_SLIDE: HeroSlide = {
  id: 'fallback',
  title: 'Crack Your Next Product Management Interview',
  highlight: 'Product Management',
  description:
    'Practice with real interview questions from top tech companies. Get coached by industry experts.',
  primary_cta_label: 'Explore Questions',
  primary_cta_href: '/questions',
  secondary_cta_label: 'View Courses',
  secondary_cta_href: '/courses',
  display_order: 0,
  is_active: true,
  created_at: null,
  updated_at: null,
};

const AUTO_ADVANCE_MS = 5000;

/** A CTA link: internal hrefs use next/link, external (http) use a plain anchor. */
function CtaButton({
  label,
  href,
  variant,
}: {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}) {
  const isExternal = /^https?:\/\//i.test(href);

  const button =
    variant === 'primary' ? (
      <Button
        size="lg"
        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    ) : (
      <Button size="lg" variant="outline" className="gap-2 text-base px-8">
        {label}
      </Button>
    );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {button}
      </a>
    );
  }
  return <Link href={href}>{button}</Link>;
}

/**
 * Renders the title with its highlight phrase wrapped in the brand gradient.
 * Falls back to the plain title if the highlight isn't found within it.
 */
function HeroTitle({ title, highlight }: { title: string; highlight: string | null }) {
  if (highlight && title.includes(highlight)) {
    const [before, after] = title.split(highlight);
    return (
      <>
        {before}
        <span className="text-gradient-brand">{highlight}</span>
        {after}
      </>
    );
  }
  return <>{title}</>;
}

export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const effectiveSlides = slides.length > 0 ? slides : [FALLBACK_SLIDE];
  const hasMultiple = effectiveSlides.length > 1;
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // indexRef avoids stale-closure bugs inside the setInterval callback.
  const indexRef = useRef(0);
  indexRef.current = index;

  const goTo = useCallback(
    (next: number) => {
      const count = effectiveSlides.length;
      const safeNext = ((next % count) + count) % count;
      const current = indexRef.current;
      if (safeNext === current) return;

      // Forward = moving to a later slide (or wrapping from last → first).
      // Backward = moving to an earlier slide (or wrapping from first → last).
      const isForward =
        safeNext > current ||
        (current === count - 1 && safeNext === 0);

      setDirection(isForward ? 'forward' : 'backward');
      setPrevIndex(current);
      setIndex(safeNext);
    },
    [effectiveSlides.length],
  );

  // Clear the exiting slide after the animation finishes (~550 ms).
  useEffect(() => {
    if (prevIndex === null) return;
    const id = setTimeout(() => setPrevIndex(null), 550);
    return () => clearTimeout(id);
  }, [prevIndex]);

  // Auto-advance only when there's more than one slide.
  useEffect(() => {
    if (!hasMultiple) return;
    const timer = setInterval(() => {
      goTo(indexRef.current + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [hasMultiple, goTo]);

  return (
    <section className="bg-gradient-hero py-20 md:py-28 relative overflow-hidden">
      {/*
       * Direction-aware slide transition:
       *   - Entering slide slides in from the right (forward) or left (backward).
       *   - Exiting slide slides out to the left (forward) or right (backward).
       *   - `forwards` fill mode keeps the exiting slide at its final off-screen
       *     position until React removes it (~550 ms timeout above).
       *   - The active slide is `relative` (drives section height); all others
       *     are `absolute inset-0` so they overlay it without a layout jump.
       */}
      <div className="relative">
        {effectiveSlides.map((slide, i) => {
          const isActive = i === index;
          const isExiting = i === prevIndex;

          let animationClass = '';
          if (isActive) {
            animationClass =
              direction === 'forward'
                ? 'animate-slide-in-from-right'
                : 'animate-slide-in-from-left';
          } else if (isExiting) {
            animationClass =
              direction === 'forward'
                ? 'animate-slide-out-to-left'
                : 'animate-slide-out-to-right';
          }

          return (
            <div
              key={slide.id}
              className={cn(
                isActive ? 'relative' : 'absolute inset-0',
                !isActive && !isExiting && 'pointer-events-none select-none opacity-0',
                isExiting && 'pointer-events-none select-none',
                animationClass,
              )}
              aria-hidden={!isActive}
            >
            <div className="container text-center max-w-3xl mx-auto space-y-6">
              <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
                <HeroTitle title={slide.title} highlight={slide.highlight} />
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                {slide.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                {slide.primary_cta_label && slide.primary_cta_href && (
                  <CtaButton
                    label={slide.primary_cta_label}
                    href={slide.primary_cta_href}
                    variant="primary"
                  />
                )}
                {slide.secondary_cta_label && slide.secondary_cta_href && (
                  <CtaButton
                    label={slide.secondary_cta_label}
                    href={slide.secondary_cta_href}
                    variant="secondary"
                  />
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {hasMultiple && (
        <>
          {/* Arrows: hidden on mobile (dots + swipe are sufficient), visible on md+ */}
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => goTo(index - 1)}
            className="absolute left-6 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => goTo(index + 1)}
            className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators: visible on all screen sizes */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {effectiveSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-primary' : 'w-2.5 bg-foreground/30 hover:bg-foreground/50',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
