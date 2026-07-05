'use client';

/**
 * hooks/useLocationSearch.ts
 *
 * A static-render-safe replacement for next/navigation's useSearchParams().
 *
 * Why not useSearchParams()?
 *   On a statically generated (ISR) route, Next.js 14 cannot know query
 *   params at build time, so ANY component calling useSearchParams() forces
 *   the ENTIRE page to bail out of static rendering — the prerendered HTML
 *   contains only the layout shell and an empty <main> (a
 *   BAILOUT_TO_CLIENT_SIDE_RENDERING template). Wrapping in <Suspense> only
 *   suppresses the build error; the page HTML is still empty. That made
 *   /questions ship ZERO crawlable content to search engines.
 *
 * How this works instead:
 *   useSyncExternalStore with:
 *   - server snapshot  → ''            (build renders the default, filterless
 *                                       view into the static HTML — real cards,
 *                                       real links, crawlable by Googlebot)
 *   - client snapshot  → location.search (real filters after hydration)
 *   React hydrates against the server snapshot first (no mismatch), then
 *   immediately re-renders with the client value if the URL has params.
 *
 *   Reactivity: Next's router.push/replace call history.pushState/replaceState
 *   under the hood, which we patch (once, module-level) to notify subscribers;
 *   popstate covers back/forward buttons.
 */

import { useMemo, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  const notify = () => listeners.forEach((l) => l());

  const patch = <T extends typeof history.pushState>(orig: T): T =>
    function (this: History, ...args: Parameters<T>) {
      const result = orig.apply(this, args);
      notify();
      return result;
    } as T;

  history.pushState = patch(history.pushState.bind(history));
  history.replaceState = patch(history.replaceState.bind(history));
  window.addEventListener('popstate', notify);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): string {
  return window.location.search;
}

// Build/SSR snapshot: no query string → components render their default view,
// which is exactly what gets baked into the static HTML.
function getServerSnapshot(): string {
  return '';
}

/** Returns the current query string as URLSearchParams ('' during SSR/SSG). */
export function useLocationSearch(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new URLSearchParams(search), [search]);
}
