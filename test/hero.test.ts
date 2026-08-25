import { describe, expect, it } from 'vitest';
import {
  HERO_SLOT_COUNT,
  formatScheduleLabel,
  heroTagTextColor,
  isWithinScheduleWindow,
  istIsoFromLocalInput,
  localInputFromIso,
  planPromotion,
  selectVisibleHeroItems,
} from '@/lib/hero';
import type { HeroItem } from '@/types';

const base = (overrides: Partial<HeroItem>): HeroItem => ({
  id: 'id',
  priority: null,
  visible: true,
  kind: 'KIND',
  title: 'Title',
  subtitle: 'Subtitle',
  meta: 'Meta',
  cta_label: 'Go',
  cta_href: '/x',
  tag_label: null,
  tag_color: '#1D7DE8',
  image_url: null,
  icon: 'graduation-cap',
  surface: 'white',
  show_from: null,
  hide_after: null,
  created_at: null,
  updated_at: null,
  ...overrides,
});

const NOW = new Date('2026-08-14T12:00:00+05:30');

describe('selectVisibleHeroItems', () => {
  it('returns slotted visible items sorted by priority', () => {
    const items = [
      base({ id: 'c', priority: 3 }),
      base({ id: 'a', priority: 1 }),
      base({ id: 'b', priority: 2 }),
    ];
    expect(selectVisibleHeroItems(items, NOW).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes bench items regardless of visibility', () => {
    const items = [base({ id: 'bench', priority: null }), base({ id: 'slot', priority: 1 })];
    expect(selectVisibleHeroItems(items, NOW).map((i) => i.id)).toEqual(['slot']);
  });

  it('excludes hidden items', () => {
    const items = [base({ id: 'off', priority: 1, visible: false }), base({ id: 'on', priority: 2 })];
    expect(selectVisibleHeroItems(items, NOW).map((i) => i.id)).toEqual(['on']);
  });

  it('excludes items outside their schedule window', () => {
    const items = [
      base({ id: 'future', priority: 1, show_from: '2026-09-01T00:00:00+05:30' }),
      base({ id: 'past', priority: 2, hide_after: '2026-08-01T00:00:00+05:30' }),
      base({ id: 'open', priority: 3, show_from: '2026-08-01T00:00:00+05:30', hide_after: '2026-09-01T00:00:00+05:30' }),
    ];
    expect(selectVisibleHeroItems(items, NOW).map((i) => i.id)).toEqual(['open']);
  });

  it('caps at three items', () => {
    // priority is DB-constrained to 1..3, but the cap must hold regardless
    const items = [1, 2, 3, 4, 5].map((p) => base({ id: `i${p}`, priority: p }));
    expect(selectVisibleHeroItems(items, NOW)).toHaveLength(HERO_SLOT_COUNT);
  });

  it('returns fewer than three when fewer are visible, and [] for none', () => {
    expect(selectVisibleHeroItems([base({ id: 'a', priority: 2 })], NOW)).toHaveLength(1);
    expect(selectVisibleHeroItems([], NOW)).toEqual([]);
  });
});

describe('isWithinScheduleWindow', () => {
  it('is inclusive at both boundaries', () => {
    const at = (s: string) => new Date(s);
    const item = { show_from: '2026-08-14T00:00:00+05:30', hide_after: '2026-08-14T23:59:00+05:30' };
    expect(isWithinScheduleWindow(item, at('2026-08-14T00:00:00+05:30'))).toBe(true);
    expect(isWithinScheduleWindow(item, at('2026-08-14T23:59:00+05:30'))).toBe(true);
    expect(isWithinScheduleWindow(item, at('2026-08-13T23:59:59+05:30'))).toBe(false);
    expect(isWithinScheduleWindow(item, at('2026-08-14T23:59:01+05:30'))).toBe(false);
  });

  it('treats null bounds as open-ended', () => {
    expect(isWithinScheduleWindow({ show_from: null, hide_after: null }, NOW)).toBe(true);
  });
});

describe('planPromotion', () => {
  const items = [
    { id: 'slot1', priority: 1 },
    { id: 'slot2', priority: 2 },
    { id: 'benchA', priority: null },
    { id: 'benchB', priority: null },
  ];

  it('promotes a bench item into an empty slot in one step', () => {
    expect(planPromotion(items, 'benchA', 3)).toEqual([{ id: 'benchA', priority: 3 }]);
  });

  it('bumps the occupant to the bench when promoting into an occupied slot', () => {
    expect(planPromotion(items, 'benchA', 1)).toEqual([
      { id: 'slot1', priority: null },
      { id: 'benchA', priority: 1 },
    ]);
  });

  it('swaps two slotted items via the bench (unique index never violated)', () => {
    expect(planPromotion(items, 'slot1', 2)).toEqual([
      { id: 'slot2', priority: null },
      { id: 'slot1', priority: 2 },
      { id: 'slot2', priority: 1 },
    ]);
  });

  it('demotes a slotted item to the bench', () => {
    expect(planPromotion(items, 'slot1', null)).toEqual([{ id: 'slot1', priority: null }]);
  });

  it('no-ops when already in place or unknown', () => {
    expect(planPromotion(items, 'slot1', 1)).toEqual([]);
    expect(planPromotion(items, 'missing', 2)).toEqual([]);
  });
});

describe('heroTagTextColor', () => {
  it('uses navy text on the amber and cyan swatches, white elsewhere', () => {
    expect(heroTagTextColor('#F59E0B')).toBe('#0B2B6B');
    expect(heroTagTextColor('#00BFFF')).toBe('#0B2B6B');
    expect(heroTagTextColor('#00bfff')).toBe('#0B2B6B'); // case-insensitive
    expect(heroTagTextColor('#1D7DE8')).toBe('#FFFFFF');
    expect(heroTagTextColor('#0B2B6B')).toBe('#FFFFFF');
    expect(heroTagTextColor('#22C55E')).toBe('#FFFFFF');
    expect(heroTagTextColor('#EF4444')).toBe('#FFFFFF');
  });
});

describe('IST schedule helpers', () => {
  it('interprets datetime-local input as IST', () => {
    expect(istIsoFromLocalInput('2026-08-24T09:30')).toBe(
      new Date('2026-08-24T09:30:00+05:30').toISOString(),
    );
    expect(istIsoFromLocalInput('')).toBeNull();
  });

  it('accepts datetime-local values that already carry seconds', () => {
    expect(istIsoFromLocalInput('2026-08-24T09:30:45')).toBe(
      new Date('2026-08-24T09:30:45+05:30').toISOString(),
    );
  });

  it('round-trips ISO ↔ datetime-local through IST', () => {
    const iso = istIsoFromLocalInput('2026-08-24T09:30');
    expect(localInputFromIso(iso)).toBe('2026-08-24T09:30');
    expect(localInputFromIso(null)).toBe('');
  });

  it('formats compact schedule labels in IST', () => {
    expect(formatScheduleLabel(null, null)).toBe('Always on');
    expect(
      formatScheduleLabel('2026-08-01T00:00:00+05:30', '2026-08-24T23:59:00+05:30'),
    ).toBe('01–24 Aug');
    expect(
      formatScheduleLabel('2026-08-24T00:00:00+05:30', '2026-09-02T00:00:00+05:30'),
    ).toBe('24 Aug – 02 Sep');
    expect(formatScheduleLabel('2026-08-24T00:00:00+05:30', null)).toBe('from 24 Aug');
    expect(formatScheduleLabel(null, '2026-08-24T00:00:00+05:30')).toBe('until 24 Aug');
    // IST day boundary: 2026-08-23T20:00Z is already 24 Aug in Kolkata
    expect(formatScheduleLabel('2026-08-23T20:00:00Z', null)).toBe('from 24 Aug');
  });
});
