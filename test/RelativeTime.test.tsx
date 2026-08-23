import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RelativeTime from '@/components/RelativeTime';

describe('RelativeTime', () => {
  it('renders a <time> carrying the machine-readable date and a relative label', () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<RelativeTime date={date} className="muted" />);
    const time = screen.getByText(/3 days ago/);
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', date);
    expect(time).toHaveClass('muted');
  });

  it('renders an empty element for a missing date', () => {
    const { container } = render(<RelativeTime date={null} />);
    const time = container.querySelector('time');
    expect(time).not.toBeNull();
    expect(time).not.toHaveAttribute('datetime');
    expect(time).toHaveTextContent('');
  });
});
