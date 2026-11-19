import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CohortAnnouncementBar, { COHORT_BAR_KEY } from '@/components/layout/CohortAnnouncementBar';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('CohortAnnouncementBar', () => {
  beforeEach(() => {
    pathname = '/';
    localStorage.clear();
  });

  it('announces Cohort 4 and links to the cohort page', () => {
    render(<CohortAnnouncementBar />);
    const link = screen.getByRole('link', { name: /Registration for Cohort 4 is now open/ });
    expect(link.getAttribute('href')).toBe('/cohort');
  });

  it('is hidden on /cohort and the admin panel', () => {
    pathname = '/cohort';
    const { container, rerender } = render(<CohortAnnouncementBar />);
    expect(container.firstChild).toBeNull();
    pathname = '/admin/questions';
    rerender(<CohortAnnouncementBar />);
    expect(container.firstChild).toBeNull();
  });

  it('shows on question pages', () => {
    pathname = '/questions/abc';
    render(<CohortAnnouncementBar />);
    expect(screen.getByText('Registration for Cohort 4 is now open')).toBeTruthy();
  });

  it('dismisses and remembers the choice', () => {
    const { container } = render(<CohortAnnouncementBar />);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }));
    expect(container.firstChild).toBeNull();
    expect(localStorage.getItem(COHORT_BAR_KEY)).toBe('1');
  });
});
