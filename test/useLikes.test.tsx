import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useToggleLike, useToggleQuestionLike } from '@/hooks/useLikes';

// vi.mock factories are hoisted above imports, so anything they close over
// has to be created with vi.hoisted.
const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { rpc: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => supabaseMock,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const withClient = (qc: QueryClient) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useToggleQuestionLike — detail-page toggle', () => {
  it('reads the liked state from the cache, not a caller argument', async () => {
    const qc = makeClient();
    // Cache says the user HAS liked this question; a stale caller would say false.
    qc.setQueryData(['user_liked_question', 'q1', 'u1'], true);
    qc.setQueryData(['question', 'q1'], { id: 'q1', upvotes: 5 });

    let resolveRpc!: (v: unknown) => void;
    supabaseMock.rpc.mockReturnValue(new Promise((r) => { resolveRpc = r; }));

    const { result } = renderHook(() => useToggleQuestionLike(), { wrapper: withClient(qc) });
    act(() => { result.current.mutate({ questionId: 'q1', userId: 'u1' }); });

    // Optimistic: un-like — heart off, counter 5 → 4 (not 5 → 6).
    await waitFor(() => expect(qc.getQueryData(['user_liked_question', 'q1', 'u1'])).toBe(false));
    expect((qc.getQueryData(['question', 'q1']) as { upvotes: number }).upvotes).toBe(4);

    resolveRpc({ data: { liked: false }, error: null });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Server agrees with the flip — heart stays off, no counter refetch needed.
    expect(qc.getQueryData(['user_liked_question', 'q1', 'u1'])).toBe(false);
  });

  it('reconciles heart and counters when the server disagrees with the flip', async () => {
    const qc = makeClient();
    qc.setQueryData(['user_liked_question', 'q1', 'u1'], false);
    qc.setQueryData(['question', 'q1'], { id: 'q1', upvotes: 5 });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    // Optimistic flip will set liked=true; server answers liked=false (it
    // processed the request as an un-like of an earlier double-fire).
    supabaseMock.rpc.mockResolvedValue({ data: { liked: false }, error: null });

    const { result } = renderHook(() => useToggleQuestionLike(), { wrapper: withClient(qc) });
    act(() => { result.current.mutate({ questionId: 'q1', userId: 'u1' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Server truth wins over the optimistic true.
    expect(qc.getQueryData(['user_liked_question', 'q1', 'u1'])).toBe(false);
    // And the wrongly-moved counters get refetched.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['question', 'q1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['questions'] });
  });

  it('rolls back the heart and refetches counters when the RPC fails', async () => {
    const qc = makeClient();
    qc.setQueryData(['user_liked_question', 'q1', 'u1'], false);
    qc.setQueryData(['question', 'q1'], { id: 'q1', upvotes: 5 });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useToggleQuestionLike(), { wrapper: withClient(qc) });
    act(() => { result.current.mutate({ questionId: 'q1', userId: 'u1' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(['user_liked_question', 'q1', 'u1'])).toBe(false);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['question', 'q1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['questions'] });
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('useToggleLike — card toggle', () => {
  it('restores the liked set AND refetches the detail count on error', async () => {
    const qc = makeClient();
    qc.setQueryData(['user_liked_question_ids', 'u1'], new Set<string>());
    qc.setQueryData(['question', 'q1'], { id: 'q1', upvotes: 5 });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useToggleLike(), { wrapper: withClient(qc) });
    act(() => { result.current.mutate({ questionId: 'q1', userId: 'u1' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData<Set<string>>(['user_liked_question_ids', 'u1'])?.has('q1')).toBe(false);
    // The B10 fix: the detail cache took the optimistic bump too — without
    // this invalidation the detail page kept the inflated count.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['question', 'q1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['questions'] });
    expect(toast.error).toHaveBeenCalled();
  });

  it('applies the optimistic delta from the cached liked set', async () => {
    const qc = makeClient();
    qc.setQueryData(['user_liked_question_ids', 'u1'], new Set<string>(['q1']));
    qc.setQueryData(['question', 'q1'], { id: 'q1', upvotes: 5 });

    let resolveRpc!: (v: unknown) => void;
    supabaseMock.rpc.mockReturnValue(new Promise((r) => { resolveRpc = r; }));

    const { result } = renderHook(() => useToggleLike(), { wrapper: withClient(qc) });
    act(() => { result.current.mutate({ questionId: 'q1', userId: 'u1' }); });

    // Already liked → optimistic un-like: removed from the set, count 5 → 4.
    await waitFor(() =>
      expect(qc.getQueryData<Set<string>>(['user_liked_question_ids', 'u1'])?.has('q1')).toBe(false),
    );
    expect((qc.getQueryData(['question', 'q1']) as { upvotes: number }).upvotes).toBe(4);

    resolveRpc({ data: { liked: false }, error: null });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('reconciles the ids set and counters when the server disagrees with the flip', async () => {
    const qc = makeClient();
    // Empty set → optimistic flip will ADD q1 (liked=true). Server says liked=false
    // (e.g. a double-fire the server processed as an un-like).
    qc.setQueryData(['user_liked_question_ids', 'u1'], new Set<string>());
    qc.setQueryData(['question', 'q1'], { id: 'q1', upvotes: 5 });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    supabaseMock.rpc.mockResolvedValue({ data: { liked: false }, error: null });

    const { result } = renderHook(() => useToggleLike(), { wrapper: withClient(qc) });
    act(() => { result.current.mutate({ questionId: 'q1', userId: 'u1' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Server truth (not liked) wins over the optimistic add.
    expect(qc.getQueryData<Set<string>>(['user_liked_question_ids', 'u1'])?.has('q1')).toBe(false);
    // And the counters it moved the wrong way get refetched.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['questions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['question', 'q1'] });
  });
});
