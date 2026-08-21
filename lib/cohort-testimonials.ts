/**
 * lib/cohort-testimonials.ts — selection and layout logic for the cohort
 * testimonial wall.
 *
 * The ordering contract is simple: `display_order` — the order the admin
 * arranges in /admin → Testimonials — IS the wall's reading order, left to
 * right across a row, then the next row. Nothing here reorders content.
 * (An earlier version "wove" video cards across the columns automatically;
 * that overrode the admin's order and was removed for exactly that reason.)
 *
 * Kept separate from the component so it stays pure and unit-testable.
 */

import { resolveVideoSource } from '@/lib/youtube';
import type { CohortTestimonial } from '@/types';

/** Column list for every read of the table — keep the two callers in sync. */
export const TESTIMONIAL_COLUMNS =
  'id, kind, visible, display_order, name, role, outcome, quote, video_url, video_length, image_url, created_at, updated_at';

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
 * Row-major round-robin: item i lands in column i % columns, so the wall reads
 * left-to-right, then down — in exactly the admin's order.
 *
 * Two properties the wall depends on:
 *   - Reassembling the columns row by row reproduces the input order.
 *   - An item's column depends only on its own index, so revealing more items
 *     ("Load more") never moves a card that is already on screen.
 *
 * CSS multi-column had neither property: it fills column one top-to-bottom
 * (column-major, which scrambles the perceived order) and re-balances every
 * card whenever items are appended — which is why the wall used to shuffle
 * when "Load more" was clicked.
 */
export function distributeIntoColumns<T>(items: T[], columns: number): T[][] {
  const cols: T[][] = Array.from({ length: Math.max(1, Math.floor(columns)) }, () => []);
  items.forEach((item, i) => cols[i % cols.length].push(item));
  return cols;
}

/**
 * True when the row has the payload its kind needs to draw a card.
 *
 * The table's CHECK constraint already blocks empty payloads, but it cannot
 * tell a YouTube link from `javascript:alert(1)` — both are non-empty text.
 * Filtering here rather than returning null from the card component matters:
 * a null card would still leave its positioned wrapper in the layout,
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
