import type { HeroItem } from '@/types';

/** Hard cap: the board renders at most three cards. */
export const HERO_SLOT_COUNT = 3;

/**
 * The six admin-pickable tag colours. Each is an existing design token —
 * secondary, accent, primary, warning, success, destructive (see globals.css).
 */
export const HERO_TAG_COLORS = [
  '#1D7DE8',
  '#00BFFF',
  '#0B2B6B',
  '#F59E0B',
  '#22C55E',
  '#EF4444',
] as const;

/**
 * Tag chips use white text except on the two light swatches (warning amber and
 * accent cyan), where navy keeps the contrast readable.
 */
export function heroTagTextColor(tagColor: string): string {
  const c = tagColor.toUpperCase();
  return c === '#F59E0B' || c === '#00BFFF' ? '#0B2B6B' : '#FFFFFF';
}

/** Lucide glyphs an item's gradient image-fallback can use. */
export const HERO_ICONS = ['graduation-cap', 'book-open', 'search', 'video', 'users'] as const;

/**
 * True when `now` falls inside the item's schedule window. Bounds are
 * timestamptz instants, so the comparison itself is timezone-agnostic —
 * Asia/Kolkata semantics are applied where the admin enters the wall-clock
 * time (istIsoFromLocalInput below).
 */
export function isWithinScheduleWindow(
  item: Pick<HeroItem, 'show_from' | 'hide_after'>,
  now: Date,
): boolean {
  if (item.show_from && now.getTime() < new Date(item.show_from).getTime()) return false;
  if (item.hide_after && now.getTime() > new Date(item.hide_after).getTime()) return false;
  return true;
}

/**
 * The public board selection: visible, slotted (priority 1..3), inside the
 * schedule window, sorted by priority, capped at HERO_SLOT_COUNT. Bench items
 * (priority null) are never rendered, whatever their visibility.
 */
export function selectVisibleHeroItems(items: HeroItem[], now: Date = new Date()): HeroItem[] {
  return items
    .filter((item) => item.visible && item.priority !== null && isWithinScheduleWindow(item, now))
    .sort((a, b) => (a.priority as number) - (b.priority as number))
    .slice(0, HERO_SLOT_COUNT);
}

/**
 * Plans the ordered priority updates for moving an item into a slot (or to the
 * bench with `targetPriority: null`). If the target slot is occupied, the
 * occupant is parked on the bench first (unique index: one item per slot);
 * when the moving item held a slot itself, the occupant takes that vacated
 * slot afterwards (a swap). Returns [] when there is nothing to do.
 */
export function planPromotion(
  items: Array<Pick<HeroItem, 'id' | 'priority'>>,
  id: string,
  targetPriority: number | null,
): Array<{ id: string; priority: number | null }> {
  const moving = items.find((i) => i.id === id);
  if (!moving || moving.priority === targetPriority) return [];
  const occupant =
    targetPriority !== null
      ? items.find((i) => i.priority === targetPriority && i.id !== id)
      : undefined;
  const steps: Array<{ id: string; priority: number | null }> = [];
  if (occupant) steps.push({ id: occupant.id, priority: null });
  steps.push({ id, priority: targetPriority });
  if (occupant && moving.priority !== null) {
    steps.push({ id: occupant.id, priority: moving.priority });
  }
  return steps;
}

// ── Asia/Kolkata schedule input helpers (admin) ──────────────────────────────

/**
 * Converts a <input type="datetime-local"> value ('YYYY-MM-DDTHH:mm') to an
 * ISO instant, interpreting the wall-clock time as IST regardless of the
 * admin's browser timezone. Empty input → null (no bound).
 */
export function istIsoFromLocalInput(value: string): string | null {
  if (!value) return null;
  // Browsers may emit 'YYYY-MM-DDTHH:mm:ss' when the value carries seconds —
  // only append ':00' to the seconds-less form.
  const v = value.length === 16 ? `${value}:00` : value;
  return new Date(`${v}+05:30`).toISOString();
}

/** Formats a stored ISO instant back into a datetime-local value in IST. */
export function localInputFromIso(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // en-CA gives YYYY-MM-DD; en-GB with hour12:false gives HH:mm.
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${day}T${time}`;
}

/**
 * Compact IST schedule label for admin rows: 'Always on', '01–24 Aug',
 * '24 Aug – 02 Sep', 'from 24 Aug' or 'until 24 Aug'.
 */
export function formatScheduleLabel(showFrom: string | null, hideAfter: string | null): string {
  if (!showFrom && !hideAfter) return 'Always on';
  const fmt = (iso: string) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
    }).formatToParts(new Date(iso));
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    // Modern ICU renders 'Sept' for en-GB — normalise to 3 letters.
    const month = (parts.find((p) => p.type === 'month')?.value ?? '').slice(0, 3);
    return `${day} ${month}`;
  };
  if (showFrom && hideAfter) {
    const [fromDay, fromMonth] = fmt(showFrom).split(' ');
    const [toDay, toMonth] = fmt(hideAfter).split(' ');
    return fromMonth === toMonth
      ? `${fromDay}–${toDay} ${toMonth}`
      : `${fromDay} ${fromMonth} – ${toDay} ${toMonth}`;
  }
  return showFrom ? `from ${fmt(showFrom)}` : `until ${fmt(hideAfter as string)}`;
}
