import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import CohortPage from '@/components/cohort/CohortPage';
import type { CohortTestimonial } from '@/types';

// The lightbox inside the testimonial wall is next/dynamic'd; resolve it to
// nothing so the render is synchronous (same approach as CohortTestimonials.test).
vi.mock('next/dynamic', () => ({ default: () => () => null }));

// CTA links come from Supabase via TanStack Query. The page falls back to its
// hardcoded URLs when the row is missing, so a null result is all the test
// needs — and it keeps the render off the network and out of a QueryClientProvider.
vi.mock('@/hooks/useCohortSettings', () => ({
  useCohortSettings: () => ({ data: null }),
}));

const textTestimonial: CohortTestimonial = {
  id: 't1',
  kind: 'text',
  visible: true,
  display_order: 0,
  name: 'Asha',
  role: 'Product Manager',
  outcome: '',
  quote: 'Shipped a working RAG prototype by week 8.',
  video_url: null,
  video_length: '',
  image_url: null,
  created_at: null,
  updated_at: null,
};

// Ids of the top-level sections in the main column, in DOM order. The hero
// and trust bar sit outside <main>, and the comparison table has no id, so
// this reads as e.g. ['curriculum', 'reviews', 'who', '', 'capstone', ...].
const sectionIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('main > section')).map((s) => s.id);

describe('CohortPage section order', () => {
  it('puts the testimonial wall directly after the curriculum and before "who this is for"', () => {
    const { container } = render(<CohortPage testimonials={[textTestimonial]} />);
    expect(sectionIds(container).slice(0, 3)).toEqual(['curriculum', 'reviews', 'who']);
  });

  it('drops the reviews section with no testimonials, so curriculum flows straight into "who this is for"', () => {
    const { container } = render(<CohortPage testimonials={[]} />);
    const ids = sectionIds(container);
    expect(ids).not.toContain('reviews');
    expect(ids.slice(0, 2)).toEqual(['curriculum', 'who']);
  });
});
