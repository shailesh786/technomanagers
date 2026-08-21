import { describe, expect, it } from 'vitest';
import {
  isRenderable,
  selectVisibleTestimonials,
  weaveTestimonials,
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

/** n text cards followed by m video cards — the worst case for CSS columns. */
const clumped = (texts: number, videos: number): CohortTestimonial[] => [
  ...Array.from({ length: videos }, (_, i) => row(`v${i}`, 'video', { display_order: i })),
  ...Array.from({ length: texts }, (_, i) => row(`t${i}`, 'text', { display_order: 100 + i })),
];

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

describe('weaveTestimonials', () => {
  const opts = { columns: 3, initialCount: 12 };

  it('is a permutation — nothing is dropped or duplicated', () => {
    for (const [texts, videos] of [[20, 4], [2, 6], [1, 1], [30, 1], [5, 5]]) {
      const input = clumped(texts, videos);
      const out = weaveTestimonials(input, opts);
      expect(out).toHaveLength(input.length);
      expect(new Set(out.map((r) => r.id)).size).toBe(input.length);
    }
  });

  it('keeps non-video cards in their original relative order', () => {
    const out = weaveTestimonials(clumped(20, 4), opts);
    const texts = out.filter((r) => r.kind === 'text').map((r) => r.id);
    expect(texts).toEqual(Array.from({ length: 20 }, (_, i) => `t${i}`));
  });

  it('spreads videos so no two share a masonry column in the first reveal', () => {
    const out = weaveTestimonials(clumped(20, 4), opts);
    const perColumn = new Map<number, number>();
    out.slice(0, opts.initialCount).forEach((item, i) => {
      if (item.kind !== 'video') return;
      // Multi-column fills column one top-to-bottom, then column two, ...
      const column = Math.floor(i / (opts.initialCount / opts.columns));
      perColumn.set(column, (perColumn.get(column) ?? 0) + 1);
    });
    expect(perColumn.size).toBe(opts.columns);
    for (const count of perColumn.values()) expect(count).toBe(1);
  });

  it('puts a video first, so the wall never opens on plain text', () => {
    expect(weaveTestimonials(clumped(20, 4), opts)[0].kind).toBe('video');
  });

  it('leaves single-kind lists untouched', () => {
    const onlyText = clumped(5, 0);
    expect(weaveTestimonials(onlyText, opts)).toEqual(onlyText);
    const onlyVideo = clumped(0, 5);
    expect(weaveTestimonials(onlyVideo, opts)).toEqual(onlyVideo);
  });

  it('survives more videos than slots in the first reveal', () => {
    const input = clumped(2, 10);
    const out = weaveTestimonials(input, opts);
    expect(new Set(out.map((r) => r.id)).size).toBe(12);
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
