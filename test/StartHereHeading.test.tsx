import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const state: {
  user: { user_metadata: Record<string, unknown> } | null;
  profile: { full_name: string | null } | null;
} = { user: null, profile: null };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user, profile: state.profile }),
}));

import StartHereHeading, { firstNameOf } from '@/components/home/StartHereHeading';

const heading = () => screen.getByRole('heading', { level: 2 });

beforeEach(() => {
  state.user = null;
  state.profile = null;
});

describe('firstNameOf', () => {
  it('takes the first word and capitalises it', () => {
    expect(firstNameOf('Shailesh Sharma')).toBe('Shailesh');
    expect(firstNameOf('  priya  k ')).toBe('Priya');
  });

  it('returns null for missing, blank or email-shaped names', () => {
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
    expect(firstNameOf(42)).toBeNull();
    expect(firstNameOf('   ')).toBeNull();
    expect(firstNameOf('someone@example.com')).toBeNull();
  });
});

describe('StartHereHeading', () => {
  it('says "Start here." when signed out', () => {
    render(<StartHereHeading />);
    expect(heading()).toHaveTextContent(/^Start here\.$/);
  });

  it('greets a signed-in user by the profile first name', () => {
    state.user = { user_metadata: { full_name: 'Google Name' } };
    state.profile = { full_name: 'Shailesh Sharma' };
    render(<StartHereHeading />);
    expect(heading()).toHaveTextContent(/^Shailesh, start here\.$/);
  });

  it('falls back to the session metadata before the profile loads', () => {
    state.user = { user_metadata: { full_name: 'Priya Kumar' } };
    render(<StartHereHeading />);
    expect(heading()).toHaveTextContent(/^Priya, start here\.$/);

    state.user = { user_metadata: { name: 'Asha Rao' } };
    render(<StartHereHeading />);
    expect(screen.getAllByRole('heading', { level: 2 })[1]).toHaveTextContent(/^Asha, start here\.$/);
  });

  it('keeps "Start here." for a signed-in user with no usable name', () => {
    state.user = { user_metadata: { email: 'someone@example.com' } };
    state.profile = { full_name: null };
    render(<StartHereHeading />);
    expect(heading()).toHaveTextContent(/^Start here\.$/);
  });
});
