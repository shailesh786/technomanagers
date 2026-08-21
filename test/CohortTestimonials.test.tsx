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
    expect(screen.getByText('Quote t14').closest('.break-inside-avoid')).toHaveClass('hidden');

    fireEvent.click(screen.getByRole('button', { name: /load 3 more/i }));

    expect(screen.getByText('Quote t14').closest('.break-inside-avoid')).not.toHaveClass('hidden');
    expect(screen.getByText('All 15 stories from the cohort')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load/i })).not.toBeInTheDocument();
  });

  it('keeps cards past the cut in the HTML so crawlers can read them', () => {
    const items = Array.from({ length: 15 }, (_, i) => row(`t${i}`, 'text', { display_order: i }));
    const { container } = render(<CohortTestimonials items={items} />);

    // Googlebot renders JS but never clicks "Load more" — every quote must be
    // in the markup, just hidden, rather than absent from the DOM.
    expect(container.querySelectorAll('blockquote')).toHaveLength(15);
    const hidden = [...container.querySelectorAll('.break-inside-avoid')].filter((el) =>
      el.classList.contains('hidden'),
    );
    expect(hidden).toHaveLength(3);
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
    // an empty wrapper that punches a hole in the masonry columns.
    expect(container.querySelectorAll('.break-inside-avoid')).toHaveLength(1);
    expect(screen.getByText('All 1 stories from the cohort')).toBeInTheDocument();
  });
});
