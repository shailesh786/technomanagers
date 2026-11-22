/**
 * lib/background.ts — run work after the HTTP response has been sent.
 *
 * On Vercel every function gets a request context with `waitUntil`, which
 * keeps the function alive (up to the route's maxDuration) until the promise
 * settles. This is the same hook `@vercel/functions`' waitUntil wraps; reading
 * it directly avoids adding a dependency. Next 14 has no `after()` yet.
 *
 * Returns true when the work was handed off. When there is no request context
 * (local `next dev`, tests), it returns false and the caller should await the
 * promise itself so the work still finishes.
 */
type RequestContext = { waitUntil?: (p: Promise<unknown>) => void };

const CONTEXT_SYMBOL = Symbol.for('@vercel/request-context');

export function runAfterResponse(promise: Promise<unknown>): boolean {
  const holder = (globalThis as unknown as Record<symbol, { get?: () => RequestContext | undefined } | undefined>)[
    CONTEXT_SYMBOL
  ];
  const waitUntil = holder?.get?.()?.waitUntil;
  if (typeof waitUntil !== 'function') return false;
  waitUntil(promise);
  return true;
}
