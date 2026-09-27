import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import HomeHero from '@/components/home/HomeHero';

const SENTENCE =
  'Land Your Dream Job as an AI Product Manager, a Program Manager, a Management Consultant, ' +
  'a Category Manager or a BizOps & Strategy Lead';

const activeRole = (container: HTMLElement) =>
  container.querySelector('.tm-role-marker[data-active="true"]')?.textContent;

afterEach(() => vi.useRealTimers());

describe('HomeHero', () => {
  it('renders exactly one h1 whose text is the single sentence', () => {
    const { container } = render(<HomeHero />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(SENTENCE);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(SENTENCE);
  });

  it('keeps the animated role lines out of the h1 and the accessibility tree', () => {
    const { container } = render(<HomeHero />);
    const marker = container.querySelector('.tm-role-marker')!;
    expect(marker.closest('h1')).toBeNull();
    expect(marker.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('links the CTAs to cohort, courses and questions', () => {
    render(<HomeHero />);
    expect(screen.getByRole('link', { name: /Join Next Cohort/ })).toHaveAttribute('href', '/cohort');
    expect(screen.getByRole('link', { name: 'Start Course' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: /Explore Questions/ })).toHaveAttribute('href', '/questions');
  });

  it('cycles the five roles every 2.2s with the matching article', () => {
    vi.useFakeTimers();
    const { container } = render(<HomeHero />);
    const order = [
      'AI Product Manager',
      'Program Manager',
      'Management Consultant',
      'Category Manager',
      'BizOps & Strategy Lead',
      'AI Product Manager',
    ];
    order.forEach((role, i) => {
      if (i > 0) act(() => void vi.advanceTimersByTime(2200));
      expect(activeRole(container)).toBe(role);
    });
    const active = container.querySelector('.tm-role-marker[data-active="true"]')!;
    expect(active.previousElementSibling?.textContent).toBe('an');
    // One incoming line, one outgoing line, the rest queued above.
    const states = [...container.querySelectorAll('[data-state]')].map((el) =>
      el.getAttribute('data-state'),
    );
    expect(states.filter((x) => x === 'current')).toHaveLength(1);
    expect(states.filter((x) => x === 'previous')).toHaveLength(1);
    expect(states.filter((x) => x === 'next')).toHaveLength(3);
  });

  it('holds the first role when reduced motion is on', () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<HomeHero />);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(activeRole(container)).toBe('AI Product Manager');
    spy.mockRestore();
  });
});
