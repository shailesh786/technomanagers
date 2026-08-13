import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroCard from '@/components/home/HeroCard';
import type { HeroItem } from '@/types';

const item = (overrides: Partial<HeroItem> = {}): HeroItem => ({
  id: 'x',
  priority: 1,
  visible: true,
  kind: 'COHORT 04',
  title: 'Ten weeks to an AI PM offer',
  subtitle: 'Live sessions, weekly case reviews.',
  meta: '₹24,999 · starts 24 Aug',
  cta_label: 'Join the cohort',
  cta_href: '/cohort',
  tag_label: 'NEW',
  tag_color: '#00BFFF',
  image_url: null,
  icon: 'graduation-cap',
  surface: 'navy',
  show_from: null,
  hide_after: null,
  created_at: null,
  updated_at: null,
  ...overrides,
});

describe('HeroCard', () => {
  it('renders the whole card as a single link with no nested interactive elements', () => {
    const { container } = render(<HeroCard item={item()} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/cohort');
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders kind, title, subtitle, meta, CTA and tag content', () => {
    render(<HeroCard item={item()} />);
    expect(screen.getByText('COHORT 04')).toBeInTheDocument();
    expect(screen.getByText('Ten weeks to an AI PM offer')).toBeInTheDocument();
    expect(screen.getByText('Live sessions, weekly case reviews.')).toBeInTheDocument();
    expect(screen.getByText('₹24,999 · starts 24 Aug')).toBeInTheDocument();
    expect(screen.getByText('Join the cohort')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('uses a plain anchor with target=_blank for external CTA links', () => {
    render(<HeroCard item={item({ cta_href: 'https://example.com/x' })} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('applies the navy surface to slot-1 style cards and white otherwise', () => {
    const { rerender } = render(<HeroCard item={item({ surface: 'navy' })} />);
    expect(screen.getByRole('link').className).toContain('bg-primary');
    rerender(<HeroCard item={item({ surface: 'white' })} />);
    expect(screen.getByRole('link').className).toContain('bg-background');
  });

  it('renders the gradient + glyph fallback when there is no image', () => {
    const { container } = render(<HeroCard item={item({ image_url: null })} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.lucide-graduation-cap')).not.toBeNull();
  });

  it('renders the uploaded image instead of the fallback when present', () => {
    const { container } = render(
      <HeroCard item={item({ image_url: 'https://cdn.example/hero.webp' })} />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example/hero.webp');
  });

  it('skips the tag chip when tag_label is empty', () => {
    render(<HeroCard item={item({ tag_label: null })} />);
    expect(screen.queryByText('NEW')).toBeNull();
  });

  it('gives light tag swatches dark text for contrast', () => {
    render(<HeroCard item={item({ tag_label: 'HOT', tag_color: '#F59E0B' })} />);
    const chip = screen.getByText('HOT');
    expect(chip.style.color).toBe('rgb(11, 43, 107)'); // #0B2B6B
    expect(chip.style.backgroundColor).toBe('rgb(245, 158, 11)');
  });
});
