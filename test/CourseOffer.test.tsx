import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import CourseOfferBar from '@/components/courses/CourseOfferBar';
import CourseOfferBox from '@/components/courses/CourseOfferBox';

const offer = { label: '20% off for a limited time', code: 'AIPM20', endsAt: '2026-11-16T23:59:59+05:30' };
const END = Date.parse(offer.endsAt);

describe('course offer expiry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the coupon before the deadline and removes it the second it passes', () => {
    vi.setSystemTime(END - 3_000);
    render(
      <>
        <CourseOfferBar offer={offer} checkoutUrl="https://topmate.io/x/pay" />
        <CourseOfferBox offer={offer} />
      </>,
    );
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getAllByText('AIPM20')).toHaveLength(2);
    expect(screen.getByText('0d 00:00:03 left')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3_000); });
    expect(screen.queryByText('AIPM20')).toBeNull();
    expect(screen.queryByText(/left$/)).toBeNull();
  });

  it('removes an offer that had already ended when the page was served', () => {
    // A cached page rendered before the deadline, opened after it.
    vi.setSystemTime(END + 60_000);
    render(<CourseOfferBox offer={offer} />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.queryByText('AIPM20')).toBeNull();
  });
});
