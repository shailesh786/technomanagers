/**
 * lib/cohort-testimonials.ts — ordering logic for the cohort testimonial wall.
 *
 * The wall is a CSS multi-column ("masonry") layout, which fills column one
 * top-to-bottom before starting column two. That makes raw `display_order`
 * a poor final ordering: three videos at the top of the list all land in the
 * first column, and the two columns to their right open with plain text.
 *
 * `weaveTestimonials` fixes that by keeping the admin's order for text and
 * screenshot cards while redistributing video cards so that the first reveal
 * opens each column near a video. Video is the scarce, highest-converting
 * asset on the page; it should be visible in the first screenful whatever the
 * column count happens to be.
 *
 * Kept separate from the component so it stays pure and unit-testable.
 */

import { resolveVideoSource } from '@/lib/youtube';
import type { CohortTestimonial } from '@/types';

/** Column list for every read of the table — keep the two callers in sync. */
export const TESTIMONIAL_COLUMNS =
  'id, kind, visible, display_order, name, role, outcome, quote, video_url, video_length, image_url, created_at, updated_at';

export interface WeaveOptions {
  /** Masonry column count the layout uses at its widest breakpoint. */
  columns: number;
  /** How many cards render before the "Load more" button. */
  initialCount: number;
}

/** Visible rows only, in admin order. Ties break on creation time, then id. */
export function selectVisibleTestimonials(rows: CohortTestimonial[]): CohortTestimonial[] {
  return rows
    .filter((r) => r.visible)
    .sort(
      (a, b) =>
        a.display_order - b.display_order ||
        (a.created_at ?? '').localeCompare(b.created_at ?? '') ||
        a.id.localeCompare(b.id),
    );
}

/**
 * Reorders `items` so video cards are spread across masonry columns.
 *
 * Guarantees: the output is a permutation of the input — every card appears
 * exactly once, and non-video cards keep their relative order.
 */
export function weaveTestimonials(
  items: CohortTestimonial[],
  { columns, initialCount }: WeaveOptions,
): CohortTestimonial[] {
  const videos = items.filter((i) => i.kind === 'video');
  const rest = items.filter((i) => i.kind !== 'video');

  // Nothing to interleave: one kind is missing, or every card is a video.
  if (videos.length === 0 || rest.length === 0) return items;

  const total = items.length;
  const initial = Math.max(1, Math.min(initialCount, total));
  const placed = new Map<number, CohortTestimonial>();

  /** Puts `item` at `pos`, or the nearest free slot (searching forward first). */
  const claim = (pos: number, item: CohortTestimonial) => {
    const start = Math.max(0, Math.min(Math.round(pos), total - 1));
    for (let p = start; p < total; p++) {
      if (!placed.has(p)) return placed.set(p, item);
    }
    for (let p = start - 1; p >= 0; p--) {
      if (!placed.has(p)) return placed.set(p, item);
    }
    // Unreachable: videos.length <= total, so a free slot always exists.
  };

  // Lead videos — one per column. Stepping by initial/lead puts each video at
  // the *start* of a column band; stepping by (initial-1)/lead (as the source
  // design did) falls short and drops two videos into the same column.
  const lead = Math.min(videos.length, Math.max(1, columns), initial);
  for (let k = 0; k < lead; k++) {
    claim((k * initial) / lead, videos[k]);
  }

  // Remaining videos — spread evenly through everything after the first reveal
  // so each "Load more" batch also opens with a video.
  const tailCount = videos.length - lead;
  for (let k = 0; k < tailCount; k++) {
    claim(initial + ((k + 1) * (total - initial)) / (tailCount + 1), videos[lead + k]);
  }

  // Walk the stream, dropping text/screenshot cards into whatever is left.
  const out: CohortTestimonial[] = [];
  let next = 0;
  for (let i = 0; i < total; i++) {
    const video = placed.get(i);
    if (video) out.push(video);
    else if (next < rest.length) out.push(rest[next++]);
  }
  // Defensive: emit anything the walk could not place rather than losing it.
  for (; next < rest.length; next++) out.push(rest[next]);

  return out;
}

/**
 * True when the row has the payload its kind needs to draw a card.
 *
 * The table's CHECK constraint already blocks empty payloads, but it cannot
 * tell a YouTube link from `javascript:alert(1)` — both are non-empty text.
 * Filtering here rather than returning null from the card component matters:
 * a null card would still leave its positioned wrapper in the masonry flow,
 * punching a blank gap in the wall.
 */
export function isRenderable(row: CohortTestimonial): boolean {
  switch (row.kind) {
    case 'text':
      return row.quote.trim().length > 0;
    case 'video':
      return resolveVideoSource(row.video_url) !== null;
    case 'image':
      return (row.image_url ?? '').trim().length > 0;
    default:
      return false;
  }
}
