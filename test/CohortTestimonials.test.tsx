import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CohortTestimonials from '@/components/cohort/CohortTestimonials';
import type { CohortTestimonial, CohortTestimonialKind } from '@/types';

// The lightbox is next/dynamic'd so it never lands in the cohort page's initial
// bundle. jsdom resolves that lazily, which would make "click opens the player"
// racy — assert the click path up to the boundary instead, and cover the player
// itself through resolveVideoSource in cohort-testimonials.test.ts.
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const row = (
  id: string,
  kind: CohortTestimonialKind,
  overrides: Partial<CohortTestimonial> = {},
): CohortTestimonial => ({
  id,
  kind,
  visible: true,
  display_order: 0,
  name: `Name ${id}`,
  role: `Role ${id}`,
  outcome: '',
  quote: kind === 'text' ? `Quote ${id}` : '',
  video_url: kind === 'video' ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : null,
  video_length: '',
  image_url: kind === 'image' ? 'https://example.com/shot.png' : null,
  created_at: null,
  updated_at: null,
  ...overrides,
});

describe('CohortTestimonials', () => {
  it('renders nothing with zero items, so the section can drop out entirely', () => {
    const { container } = render(<CohortTestimonials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every row is hidden', () => {
    const { container } = render(
      <CohortTestimonials items={[row('a', 'text', { visible: false })]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('links a video card to YouTube so it works without JS and stays crawlable', () => {
    render(<CohortTestimonials items={[row('v', 'video'), row('t', 'text')]} />);
    const link = screen.getByRole('link', { name: /play video testimonial/i });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('shows the runtime on the play badge, or a Watch label when it is blank', () => {
    const { unmount } = render(<CohortTestimonials items={[row('v', 'video', { video_length: '2:14' })]} />);
    expect(screen.getByText('2:14')).toBeInTheDocument();
    unmount();
    render(<CohortTestimonials items={[row('v', 'video')]} />);
    expect(screen.getByText('Watch')).toBeInTheDocument();
  });

  it('renders the quote and attribution on a written card', () => {
    render(<CohortTestimonials items={[row('t', 'text', { outcome: 'Offer at Acme' })]} />);
    expect(screen.getByText('Quote t')).toBeInTheDocument();
    expect(screen.getByText('Name t')).toBeInTheDocument();
    expect(screen.getByText('Offer at Acme')).toBeInTheDocument();
  });

  it('reveals a batch at a time and retires the button at the end', () => {
    const items = Array.from({ length: 15 }, (_, i) => row(`t${i}`, 'text', { display_order: i }));
    render(<CohortTestimonials items={items} />);

    expect(screen.getByText('Showing 12 of 15 stories')).toBeInTheDocument();
    expect(screen.getByText('Quote t14').closest('[data-testid="wall-item"]')).toHaveClass('hidden');

    fireEvent.click(screen.getByRole('button', { name: /load 3 more/i }));

    expect(screen.getByText('Quote t14').closest('[data-testid="wall-item"]')).not.toHaveClass('hidden');
    expect(screen.getByText('All 15 stories from the cohort')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load/i })).not.toBeInTheDocument();
  });

  it('keeps cards past the cut in the HTML so crawlers can read them', () => {
    const items = Array.from({ length: 15 }, (_, i) => row(`t${i}`, 'text', { display_order: i }));
    const { container } = render(<CohortTestimonials items={items} />);

    // Googlebot renders JS but never clicks "Load more" — every quote must be
    // in the markup, just hidden, rather than absent from the DOM.
    expect(container.querySelectorAll('blockquote')).toHaveLength(15);
    const hidden = [...container.querySelectorAll('[data-testid="wall-item"]')].filter((el) =>
      el.classList.contains('hidden'),
    );
    expect(hidden).toHaveLength(3);
  });

  it('renders exactly the admin order — videos are never re-shuffled', () => {
    // The old "weave" moved video cards around; this pins the regression.
    // jsdom's matchMedia mock matches nothing, so the wall settles on one
    // column and DOM order IS reading order.
    const items = [
      row('t1', 'text', { display_order: 0 }),
      row('v1', 'video', { display_order: 10 }),
      row('t2', 'text', { display_order: 20 }),
      row('v2', 'video', { display_order: 30 }),
      row('i1', 'image', { display_order: 40 }),
    ];
    const { container } = render(<CohortTestimonials items={items} />);
    const order = [...container.querySelectorAll('[data-testid="wall-item"]')].map(
      (el) => el.textContent?.match(/Name \w\d+/)?.[0] ?? 'image',
    );
    expect(order).toEqual(['Name t1', 'Name v1', 'Name t2', 'Name v2', 'image']);
  });

  it('sorts by display_order, not by array position', () => {
    const items = [
      row('b', 'text', { display_order: 20 }),
      row('a', 'text', { display_order: 10 }),
    ];
    const { container } = render(<CohortTestimonials items={items} />);
    const order = [...container.querySelectorAll('[data-testid="wall-item"]')].map((el) => el.textContent);
    expect(order[0]).toContain('Quote a');
    expect(order[1]).toContain('Quote b');
  });

  it('keeps every already-visible card in place when more are revealed', () => {
    const items = Array.from({ length: 15 }, (_, i) => row(`t${i}`, 'text', { display_order: i }));
    const { container } = render(<CohortTestimonials items={items} />);

    const positions = () => {
      const map = new Map<string, string>();
      [...container.querySelectorAll('[data-testid="wall-item"]')].forEach((el) => {
        const name = el.textContent?.match(/Name t\d+/)?.[0];
        const column = el.parentElement;
        const indexInColumn = [...(column?.children ?? [])].indexOf(el);
        if (name) map.set(name, `${[...(column?.parentElement?.children ?? [])].indexOf(column!)}:${indexInColumn}`);
      });
      return map;
    };

    const before = positions();
    fireEvent.click(screen.getByRole('button', { name: /load 3 more/i }));
    const after = positions();

    // Every card that was on screen before is in the same column, same slot.
    for (const [name, slot] of before) expect(after.get(name)).toBe(slot);
  });

  it('drops a video row whose URL is unusable, leaving no gap in the wall', () => {
    const { container } = render(
      <CohortTestimonials
        items={[row('bad', 'video', { video_url: 'javascript:alert(1)' }), row('t', 'text')]}
      />,
    );
    expect(screen.queryByRole('link', { name: /play video testimonial/i })).not.toBeInTheDocument();
    expect(screen.getByText('Quote t')).toBeInTheDocument();
    // The unrenderable row must be filtered out of the stream, not rendered as
    // an empty wrapper that punches a hole in the wall.
    expect(container.querySelectorAll('[data-testid="wall-item"]')).toHaveLength(1);
    expect(screen.getByText('All 1 stories from the cohort')).toBeInTheDocument();
  });
});
