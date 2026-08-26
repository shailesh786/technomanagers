import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QuestionAccessProvider, useQuestionAccess } from '@/contexts/QuestionAccessContext';

// vi.mock factories are hoisted above imports, so anything they close over
// has to be created with vi.hoisted.
const { authState } = vi.hoisted(() => ({
  authState: { user: null as null | { id: string } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QuestionAccessProvider>{children}</QuestionAccessProvider>
);

const view = (result: { current: ReturnType<typeof useQuestionAccess> }, id: string) => {
  let allowed!: boolean;
  act(() => {
    allowed = result.current.recordView(id);
  });
  return allowed;
};

beforeEach(() => {
  authState.user = null;
});

describe('free-view gate — a true 2 free answers', () => {
  it('allows the first two distinct questions and keeps both unlocked', () => {
    const { result } = renderHook(() => useQuestionAccess(), { wrapper });

    expect(view(result, 'q1')).toBe(true);
    expect(result.current.isExhausted).toBe(false);
    expect(result.current.isViewed('q1')).toBe(true);

    // THE fix (B5): the 2nd view flips isExhausted, but q2 itself counts as
    // viewed — so `isExhausted && !isViewed(id)` stays false and its answer
    // is readable. Visitors really get the 2 answers the modal promises.
    expect(view(result, 'q2')).toBe(true);
    expect(result.current.isExhausted).toBe(true);
    expect(result.current.isViewed('q2')).toBe(true);
    expect(result.current.gateOpen).toBe(false);
  });

  it('gates the third distinct question and opens the sign-in modal', () => {
    const { result } = renderHook(() => useQuestionAccess(), { wrapper });
    view(result, 'q1');
    view(result, 'q2');

    expect(view(result, 'q3')).toBe(false);
    expect(result.current.gateOpen).toBe(true);
    expect(result.current.isViewed('q3')).toBe(false);
  });

  it('keeps already-viewed questions readable after free views run out', () => {
    const { result } = renderHook(() => useQuestionAccess(), { wrapper });
    view(result, 'q1');
    view(result, 'q2');
    view(result, 'q3'); // gated

    expect(view(result, 'q1')).toBe(true);
    expect(view(result, 'q2')).toBe(true);
    expect(result.current.isViewed('q1')).toBe(true);
    expect(result.current.viewedCount).toBe(2);
  });

  it('never gates a signed-in user', () => {
    authState.user = { id: 'u1' };
    const { result } = renderHook(() => useQuestionAccess(), { wrapper });

    expect(view(result, 'q1')).toBe(true);
    expect(view(result, 'q2')).toBe(true);
    expect(view(result, 'q3')).toBe(true);
    expect(result.current.isExhausted).toBe(false);
    expect(result.current.gateOpen).toBe(false);
  });
});
