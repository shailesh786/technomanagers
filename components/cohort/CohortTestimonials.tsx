'use client';

/**
 * components/cohort/CohortTestimonials.tsx — the cohort testimonial wall.
 *
 * One column-based wall mixing video stories, written quotes and review
 * screenshots.
 *
 * ── Ordering contract ─────────────────────────────────────────────────────
 * The admin's order in /admin → Testimonials IS the wall's order: card i sits
 * in column i % N, so the wall reads left-to-right across a row, then the
 * next row — and "Load more" only appends to the bottoms of the columns,
 * never moving a card that is already on screen.
 *
 * The columns are built in JS (distributeIntoColumns) rather than CSS
 * multi-column for exactly those two guarantees: CSS columns lay out
 * column-major (top-to-bottom, then the next column), which scrambles the
 * perceived order, and they re-balance every card whenever items are
 * appended, so each "Load more" used to shuffle the whole wall.
 *
 * ── Performance ───────────────────────────────────────────────────────────
 * This section sits well below the fold on a long page, so nothing here costs
 * anything until it is reached or clicked:
 *   - No YouTube iframe on load. Cards paint a poster image and only mount a
 *     player after a click. Four eager embeds would be ~4 MB of third-party JS
 *     on a page whose whole point is a fast first paint.
 *   - The lightbox (Radix Dialog + player) is code-split via next/dynamic, so
 *     it is fetched on first open and never during hydration.
 *   - Rows arrive as props from the ISR-cached server fetch in app/cohort/page,
 *     so there is no client-side data waterfall.
 *
 * ── Why every card is in the DOM ──────────────────────────────────────────
 * Cards past the "Load more" cut are rendered but `display:none`, not omitted.
 * Googlebot renders JavaScript but does not click buttons, so anything gated
 * behind the button would never be indexed — and these quotes are some of the
 * most valuable crawlable copy on the page. Hiding rather than unmounting
 * costs nothing at runtime either: the lazy-loaded images inside a
 * `display:none` subtree are never requested until they are revealed.
 *
 * The section chrome (eyebrow, heading, lead paragraph) is owned by CohortPage
 * so this section keeps the same rhythm as every other one on the page.
 */

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Play, CheckCircle2, ChevronDown, Expand } from 'lucide-react';
import { selectVisibleTestimonials, distributeIntoColumns, isRenderable } from '@/lib/cohort-testimonials';
import { resolveVideoSource, type VideoSource } from '@/lib/youtube';
import type { CohortTestimonial } from '@/types';

const TestimonialLightbox = dynamic(() => import('./TestimonialLightbox'), { ssr: false });

const INITIAL_COUNT = 12;
const BATCH_SIZE = 12;

/** Avatar tints — all drawn from the brand navy/blue/slate family. */
const AVATAR_TINTS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  '#1e3a8a',
  '#0e7490',
  '#475569',
  '#334155',
];

/** Stable per-row tint: derived from the id so it survives reveals and reorders. */
function tintFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '★';
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** "Varun Khanna, Product Lead at Google" — used for alt text and aria labels. */
function describe(item: CohortTestimonial): string {
  return [item.name, item.role].filter((s) => s.trim()).join(', ');
}

/* ── Video poster ──────────────────────────────────────────────────────────
   YouTube generates maxresdefault.jpg (1280x720, true 16:9) only for uploads
   with enough source resolution; hqdefault.jpg (480x360) exists for every
   video. Start sharp, step down on error, then fall back to the brand gradient
   so a dead or non-YouTube link never renders an empty tile.               */

function VideoPoster({
  source,
  override,
  alt,
}: {
  source: VideoSource;
  override: string | null;
  alt: string;
}) {
  const chain = useMemo(() => {
    if (override) return [override];
    return source.type === 'youtube' ? [source.poster, source.posterFallback] : [];
  }, [override, source]);

  const [step, setStep] = useState(0);
  // Walking off the end is the signal to give up and paint the gradient —
  // clamping to the last entry would retry a URL already known to 404.
  const src = step < chain.length ? chain[step] : undefined;

  if (!src) {
    return (
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 320px"
      className="object-cover"
      onError={() => setStep((s) => s + 1)}
    />
  );
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

function VideoCard({ item, onOpen }: { item: CohortTestimonial; onOpen: () => void }) {
  const source = resolveVideoSource(item.video_url);
  if (!source) return null;

  const who = describe(item);

  return (
    <a
      // Without JS this is still a working link to the video; with JS we
      // intercept it and play in an overlay so the visitor keeps their place.
      // Keeping it a real href also means crawlers see the outbound link.
      href={source.type === 'youtube' ? source.watchUrl : source.src}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        // Let modified clicks (new tab, download) behave normally.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onOpen();
      }}
      className="group relative block h-[352px] overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--primary))' }}
      aria-label={`Play video testimonial${who ? ` from ${who}` : ''}`}
    >
      {/* Decorative: the name and role are already text in this card, and the
          link carries its own accessible label. */}
      <VideoPoster source={source} override={item.image_url} alt="" />

      {/* Legibility scrim — dark at both ends, clear through the middle so the
          speaker's face stays visible. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0) 34%, hsl(var(--foreground) / 0.9) 100%)',
        }}
      />

      <span
        className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 py-[5px] pl-[9px] pr-[11px] font-heading text-[11px] font-semibold transition-colors group-hover:bg-secondary group-hover:text-white"
        style={{ color: 'hsl(var(--primary))' }}
      >
        <Play className="h-[11px] w-[11px] fill-current" aria-hidden />
        {item.video_length || 'Watch'}
      </span>

      <span className="pointer-events-none absolute inset-x-3.5 bottom-3 block">
        {item.outcome && (
          <span
            className="mb-2 inline-block rounded-full px-2.5 py-[3px] font-heading text-[10.5px] font-semibold text-white"
            style={{ backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
          >
            {item.outcome}
          </span>
        )}
        {item.quote && (
          <span className="mb-2.5 block text-[12.5px] leading-[1.45] text-white/90">{item.quote}</span>
        )}
        {item.name && <span className="block font-heading text-[13.5px] font-bold text-white">{item.name}</span>}
        {item.role && <span className="block text-[11.5px] text-white/75">{item.role}</span>}
      </span>
    </a>
  );
}

function TextCard({ item }: { item: CohortTestimonial }) {
  return (
    <figure
      className="rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{
        borderColor: 'hsl(var(--border))',
        // Outcome quotes get the sunken surface so wins read as a distinct
        // tier without needing a louder colour.
        background: item.outcome ? 'hsl(var(--muted))' : '#fff',
      }}
    >
      {item.outcome && (
        <span
          className="mb-3 inline-block rounded-full px-2.5 py-1 font-heading text-[10.5px] font-semibold text-white"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {item.outcome}
        </span>
      )}
      <blockquote className="m-0 text-sm leading-[1.7]" style={{ color: 'hsl(var(--foreground))', textWrap: 'pretty' }}>
        {item.quote}
      </blockquote>
      <figcaption
        className="mt-4 flex items-center gap-2.5 border-t pt-3"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-heading text-[11.5px] font-bold text-white"
          style={{ background: tintFor(item.id) }}
          aria-hidden
        >
          {initialsOf(item.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-heading text-[13px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {item.name}
          </span>
          <span className="block truncate text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {item.role}
          </span>
        </span>
        <CheckCircle2 className="h-3.5 w-3.5 flex-none text-slate-300" aria-hidden />
      </figcaption>
    </figure>
  );
}

function ImageCard({ item, onOpen }: { item: CohortTestimonial; onOpen: () => void }) {
  if (!item.image_url) return null;
  const who = describe(item);
  // A screenshot is pixels: neither a crawler nor a screen reader can read the
  // review inside it. The admin's Quote field is the transcription, so prefer
  // it for alt text and fall back to attribution.
  const alt =
    item.quote.trim() ||
    (who ? `Review from ${who}` : 'Review screenshot from a cohort member');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-xl border bg-white p-0 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ borderColor: 'hsl(var(--border))' }}
      aria-label={`Open review screenshot${who ? ` from ${who}` : ''} full size`}
    >
      {/* Capped because review screenshots are often very tall chat captures.
          A single 1500px card starves its column and leaves the others short,
          which reads as a broken layout rather than a masonry one. The full
          image is one click away in the lightbox. */}
      <span className="relative block max-h-[600px] overflow-hidden md:max-h-[460px]">
        <Image
          src={item.image_url}
          alt={alt}
          width={800}
          height={600}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 320px"
          style={{ width: '100%', height: 'auto' }}
        />
        {/* Fade hinting there is more to see. Invisible over a short image,
            since it sits on the card's own white background. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
          style={{ backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff)' }}
        />
      </span>
      <span
        aria-hidden
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ color: 'hsl(var(--primary))' }}
      >
        <Expand className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/* ── Responsive column count ───────────────────────────────────────────── */

/** Wall breakpoints, mirroring Tailwind's md and xl. First match wins. */
const COLUMN_QUERIES: Array<[query: string, columns: number]> = [
  ['(min-width: 1280px)', 3],
  ['(min-width: 768px)', 2],
];

/**
 * Server rendering has no viewport, so SSR and first client render use the
 * desktop value (3) and an effect corrects it. The section sits thousands of
 * pixels below the fold, so the correction lands long before the wall is
 * scrolled into view; the container's flex-col fallback keeps the pre-
 * hydration markup readable on a phone regardless.
 */
function useColumnCount(): number {
  const [columns, setColumns] = useState(3);
  useEffect(() => {
    const lists = COLUMN_QUERIES.map(([query]) => window.matchMedia(query));
    const apply = () => {
      const first = lists.findIndex((l) => l.matches);
      setColumns(first === -1 ? 1 : COLUMN_QUERIES[first][1]);
    };
    apply();
    // Both signals: MediaQueryList 'change' is the precise one; plain
    // 'resize' backs it up for environments that are lax about dispatching
    // MQL events. setColumns bails out when the value is unchanged, so the
    // duplicate events cost nothing.
    lists.forEach((l) => l.addEventListener('change', apply));
    window.addEventListener('resize', apply);
    return () => {
      lists.forEach((l) => l.removeEventListener('change', apply));
      window.removeEventListener('resize', apply);
    };
  }, []);
  return columns;
}

/* ── Section ───────────────────────────────────────────────────────────── */

export default function CohortTestimonials({ items }: { items: CohortTestimonial[] }) {
  const [shown, setShown] = useState(INITIAL_COUNT);
  const [active, setActive] = useState<CohortTestimonial | null>(null);
  const columns = useColumnCount();

  // Admin order, verbatim — display_order is the wall's reading order.
  const stream = useMemo(() => selectVisibleTestimonials(items).filter(isRenderable), [items]);

  // Nothing publishable — render nothing rather than an empty shell, the same
  // contract HeroPriorityBoard uses on the homepage.
  if (stream.length === 0) return null;

  const remaining = Math.max(0, stream.length - shown);
  // Distribute EVERY card, hidden ones included: an item's column comes from
  // its index alone, so revealing more never relocates what is already shown,
  // and the hidden tail stays in the DOM for crawlers.
  const cols = distributeIntoColumns(stream.map((item, i) => ({ item, i })), columns);

  return (
    <>
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        {cols.map((column, c) => (
          <div key={c} className="min-w-0 flex-1 space-y-5">
            {column.map(({ item, i }) => {
              const hidden = i >= shown;
              // Revealed cards animate in; the first batch is server-rendered
              // and its animation would have finished long before anyone
              // scrolls here.
              const revealed = !hidden && i >= INITIAL_COUNT;
              return (
                <div
                  key={item.id}
                  data-testid="wall-item"
                  className={`${hidden ? 'hidden' : ''} ${
                    revealed ? 'animate-fade-in motion-reduce:animate-none' : ''
                  }`}
                  style={revealed ? { animationDelay: `${Math.min((i - INITIAL_COUNT) % BATCH_SIZE, 8) * 40}ms` } : undefined}
                >
                  {item.kind === 'video' && <VideoCard item={item} onOpen={() => setActive(item)} />}
                  {item.kind === 'text' && <TextCard item={item} />}
                  {item.kind === 'image' && <ImageCard item={item} onOpen={() => setActive(item)} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3.5 pt-2">
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShown((s) => s + BATCH_SIZE)}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-heading text-sm font-semibold text-white transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ background: 'hsl(var(--primary))' }}
          >
            Load {Math.min(BATCH_SIZE, remaining)} more
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        )}
        <span className="text-[12.5px]" style={{ color: 'hsl(var(--muted-foreground))' }} aria-live="polite">
          {remaining > 0
            ? `Showing ${shown} of ${stream.length} stories`
            : `All ${stream.length} stories from the cohort`}
        </span>
      </div>

      {active && <TestimonialLightbox item={active} onClose={() => setActive(null)} />}
    </>
  );
}
