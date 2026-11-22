import { describe, it, expect, afterEach, vi } from 'vitest';
import { runAfterResponse } from '@/lib/background';

const KEY = Symbol.for('@vercel/request-context');
const g = globalThis as unknown as Record<symbol, unknown>;

describe('runAfterResponse', () => {
  afterEach(() => {
    delete g[KEY];
  });

  it('returns false outside Vercel so the caller awaits the work itself', () => {
    expect(runAfterResponse(Promise.resolve())).toBe(false);
  });

  it("hands the promise to Vercel's waitUntil when a request context exists", () => {
    const waitUntil = vi.fn();
    g[KEY] = { get: () => ({ waitUntil }) };
    const p = Promise.resolve();
    expect(runAfterResponse(p)).toBe(true);
    expect(waitUntil).toHaveBeenCalledWith(p);
  });
});
