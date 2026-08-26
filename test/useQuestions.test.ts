import { describe, expect, it, vi } from 'vitest';
import { hashKey } from '@tanstack/react-query';
import { questionsQueryOptions } from '@/hooks/useQuestions';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({}),
}));

describe('questionsQueryOptions — key contract with the server prefetches', () => {
  it('produces the exact documented key for the default /questions list', () => {
    // This literal is what app/questions/page.tsx prefetches. If this test
    // fails, the HydrationBoundary cache is being silently ignored and the
    // client refetches page 1 on every load.
    const serverKey = [
      'questions',
      {
        categories: [],
        companies: [],
        difficulties: [],
        role: undefined,
        search: '',
        sort: 'Newest',
        limit: 20,
        offset: 0,
      },
    ];
    const opts = questionsQueryOptions({
      categories: [],
      companies: [],
      difficulties: [],
      role: undefined,
      search: '',
      sort: 'Newest',
      limit: 20,
      offset: 0,
    });
    expect(opts.queryKey).toEqual(serverKey);
    expect(hashKey(opts.queryKey)).toBe(hashKey(serverKey));
  });

  it('hashes `role: undefined` identically to an absent role (the hydration contract)', () => {
    const withUndefined = questionsQueryOptions({ sort: 'Newest', role: undefined, limit: 20, offset: 0 });
    const without = questionsQueryOptions({ sort: 'Newest', limit: 20, offset: 0 });
    expect(hashKey(withUndefined.queryKey)).toBe(hashKey(without.queryKey));
  });

  it('matches the homepage featured prefetch key', () => {
    // app/page.tsx prefetches ['questions', { sort: 'Hot', limit: 4 }].
    const opts = questionsQueryOptions({ sort: 'Hot', limit: 4 });
    expect(hashKey(opts.queryKey)).toBe(hashKey(['questions', { sort: 'Hot', limit: 4 }]));
  });

  it('gives different pages different keys and keeps property order irrelevant', () => {
    const page0 = questionsQueryOptions({ sort: 'Newest', limit: 20, offset: 0 });
    const page1 = questionsQueryOptions({ sort: 'Newest', limit: 20, offset: 20 });
    expect(hashKey(page0.queryKey)).not.toBe(hashKey(page1.queryKey));

    const reordered = questionsQueryOptions({ offset: 0, limit: 20, sort: 'Newest' });
    expect(hashKey(reordered.queryKey)).toBe(hashKey(page0.queryKey));
  });

  it('keeps the 5-minute staleTime that makes hydrated mounts trust the prefetch', () => {
    expect(questionsQueryOptions({ sort: 'Newest' }).staleTime).toBe(5 * 60 * 1000);
  });
});
