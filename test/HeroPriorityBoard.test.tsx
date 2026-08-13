import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroPriorityBoard from '@/components/home/HeroPriorityBoard';
import type { HeroItem } from '@/types';

const item = (id: string, priority: number): HeroItem => ({
  id,
  priority,
  visible: true,
  kind: `KIND ${id}`,
  title: `Title ${id}`,
  subtitle: `Subtitle ${id}`,
  meta: `Meta ${id}`,
  cta_label: 'Open',
  cta_href: `/${id}`,
  tag_label: null,
  tag_color: '#1D7DE8',
  image_url: null,
  icon: 'book-open',
  surface: 'white',
  show_from: null,
  hide_after: null,
  created_at: null,
  updated_at: null,
});

const three = [item('a', 1), item('b', 2), item('c', 3)];

describe('HeroPriorityBoard', () => {
  it('renders nothing at all with zero items — no empty state', () => {
    const { container } = render(<HeroPriorityBoard items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the header copy and each item once per breakpoint variant', () => {
    render(<HeroPriorityBoard items={three} />);
    expect(screen.getByRole('heading', { name: 'Start here.' })).toBeInTheDocument();
    expect(screen.getByText('Three things worth your next hour')).toBeInTheDocument();
    // desktop grid + mobile track each render the card
    expect(screen.getAllByText('Title a')).toHaveLength(2);
    expect(screen.getAllByText('Title c')).toHaveLength(2);
  });

  it('uses an h2 for the visible heading — the page h1 lives in app/page.tsx', () => {
    render(<HeroPriorityBoard items={three} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Start here.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('preloads only the first card image (LCP) in each breakpoint variant', () => {
    const withImages = three.map((i) => ({ ...i, image_url: `https://cdn.example/${i.id}.webp` }));
    const { container } = render(<HeroPriorityBoard items={withImages} />);
    const imgs = [...container.querySelectorAll('img')];
    expect(imgs).toHaveLength(6); // 3 desktop + 3 mobile
    const prioritized = imgs.filter((img) => img.dataset.priority === 'true');
    expect(prioritized).toHaveLength(2); // card 1 in both variants, same URL → one preload
    prioritized.forEach((img) => expect(img).toHaveAttribute('src', 'https://cdn.example/a.webp'));
  });

  it('shows a counter and one dot per item, first dot active', () => {
    render(<HeroPriorityBoard items={three} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    const dots = screen.getAllByRole('button', { name: /Go to item/ });
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(dots[1]).toHaveAttribute('aria-current', 'false');
  });

  it('follows the visible count with 2 items (counter 1 / 2, two dots)', () => {
    render(<HeroPriorityBoard items={three.slice(0, 2)} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Go to item/ })).toHaveLength(2);
  });

  it('renders a single item without dots (nothing to page through)', () => {
    render(<HeroPriorityBoard items={three.slice(0, 1)} />);
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /Go to item/ })).toHaveLength(0);
  });

  it('marks the mobile track as a keyboard-reachable carousel', () => {
    render(<HeroPriorityBoard items={three} />);
    const track = screen.getByRole('group', { name: /Start here — 3 items/ });
    expect(track).toHaveAttribute('tabindex', '0');
    expect(track).toHaveAttribute('aria-roledescription', 'carousel');
  });

  it('never renders autoplay or arrow controls', () => {
    render(<HeroPriorityBoard items={three} />);
    const buttons = screen.getAllByRole('button');
    // dots only — no prev/next arrows
    expect(buttons.every((b) => /Go to item/.test(b.getAttribute('aria-label') ?? ''))).toBe(true);
  });
});
