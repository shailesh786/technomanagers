import { describe, expect, it } from 'vitest';
import {
  distributeIntoColumns,
  isRenderable,
  selectVisibleTestimonials,
} from '@/lib/cohort-testimonials';
import { parseYouTubeId, resolveVideoSource } from '@/lib/youtube';
import type { CohortTestimonial, CohortTestimonialKind } from '@/types';

const row = (id: string, kind: CohortTestimonialKind, overrides: Partial<CohortTestimonial> = {}): CohortTestimonial => ({
  id,
  kind,
  visible: true,
  display_order: 0,
  name: 'Name',
  role: 'Role',
  outcome: '',
  quote: kind === 'text' ? 'A quote' : '',
  video_url: kind === 'video' ? 'https://youtu.be/dQw4w9WgXcQ' : null,
  video_length: '',
  image_url: kind === 'image' ? 'https://example.com/shot.png' : null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
  ...overrides,
});

describe('selectVisibleTestimonials', () => {
  it('drops hidden rows', () => {
    const rows = [row('a', 'text'), row('b', 'text', { visible: false })];
    expect(selectVisibleTestimonials(rows).map((r) => r.id)).toEqual(['a']);
  });

  it('sorts by display_order, then created_at, then id', () => {
    const rows = [
      row('c', 'text', { display_order: 20 }),
      row('a', 'text', { display_order: 10, created_at: '2026-02-01T00:00:00Z' }),
      row('b', 'text', { display_order: 10, created_at: '2026-01-01T00:00:00Z' }),
    ];
    expect(selectVisibleTestimonials(rows).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('distributeIntoColumns', () => {
  const items = [0, 1, 2, 3, 4, 5, 6];

  it('deals row-major: item i lands in column i % n', () => {
    expect(distributeIntoColumns(items, 3)).toEqual([
      [0, 3, 6],
      [1, 4],
      [2, 5],
    ]);
  });

  it('reassembling the columns row by row reproduces the input order', () => {
    const cols = distributeIntoColumns(items, 3);
    const rebuilt: number[] = [];
    for (let r = 0; r < Math.max(...cols.map((c) => c.length)); r++) {
      cols.forEach((c) => { if (c[r] !== undefined) rebuilt.push(c[r]); });
    }
    expect(rebuilt).toEqual(items);
  });

  it('growing the list never moves an existing item to another column', () => {
    // This is the "Load more" guarantee: an item's column depends only on its
    // own index, so appending items cannot relocate what is already shown.
    const before = distributeIntoColumns(items.slice(0, 4), 3);
    const after = distributeIntoColumns(items, 3);
    before.forEach((col, c) => col.forEach((v) => expect(after[c]).toContain(v)));
  });

  it('clamps a nonsensical column count to a single column', () => {
    expect(distributeIntoColumns(items, 0)).toEqual([items]);
    expect(distributeIntoColumns(items, -2)).toEqual([items]);
  });

  it('returns empty columns for an empty list', () => {
    expect(distributeIntoColumns([], 3)).toEqual([[], [], []]);
  });
});

describe('isRenderable', () => {
  it('accepts a row that carries the payload its kind draws', () => {
    expect(isRenderable(row('a', 'text'))).toBe(true);
    expect(isRenderable(row('b', 'video'))).toBe(true);
    expect(isRenderable(row('c', 'image'))).toBe(true);
  });

  it('rejects a payload the table CHECK cannot catch', () => {
    // Non-empty, so the DB accepts it, but it resolves to no playable source.
    expect(isRenderable(row('a', 'video', { video_url: 'javascript:alert(1)' }))).toBe(false);
    expect(isRenderable(row('b', 'text', { quote: '   ' }))).toBe(false);
    expect(isRenderable(row('c', 'image', { image_url: '  ' }))).toBe(false);
  });
});

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=42', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?list=PL123&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share  ', 'dQw4w9WgXcQ'],
  ])('parses %s', (url, id) => {
    expect(parseYouTubeId(url)).toBe(id);
  });

  it.each([['https://vimeo.com/12345'], ['not a url'], [''], [null], [undefined]])(
    'returns null for %s',
    (url) => {
      expect(parseYouTubeId(url as string | null)).toBeNull();
    },
  );
});

describe('resolveVideoSource', () => {
  it('builds nocookie embed and both poster sizes for YouTube', () => {
    const source = resolveVideoSource('https://youtu.be/dQw4w9WgXcQ');
    expect(source).toMatchObject({
      type: 'youtube',
      id: 'dQw4w9WgXcQ',
      watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      poster: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      posterFallback: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
    expect(source && 'embedUrl' in source && source.embedUrl).toContain('youtube-nocookie.com');
  });

  it('treats other http(s) links as direct media', () => {
    expect(resolveVideoSource('https://res.cloudinary.com/x/video/upload/v1/a.mp4')).toEqual({
      type: 'file',
      src: 'https://res.cloudinary.com/x/video/upload/v1/a.mp4',
    });
  });

  it('keeps a query string on a direct media URL', () => {
    expect(resolveVideoSource('https://cdn.example.com/a.mp4?v=2')).toEqual({
      type: 'file',
      src: 'https://cdn.example.com/a.mp4?v=2',
    });
  });

  it('rejects non-http schemes so a bad row cannot become a javascript: href', () => {
    expect(resolveVideoSource('javascript:alert(1)')).toBeNull();
    expect(resolveVideoSource('   ')).toBeNull();
  });

  it('rejects a page URL that is neither YouTube nor a playable file', () => {
    // Would otherwise become <video src="https://vimeo.com/12345"> — a player
    // that renders and then permanently fails to load.
    expect(resolveVideoSource('https://vimeo.com/12345')).toBeNull();
    expect(resolveVideoSource('https://www.linkedin.com/posts/abc')).toBeNull();
  });
});
