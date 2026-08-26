/**
 * lib/safe-redirect.ts — validate a caller-supplied `?next=` path so it can
 * only ever point back into our own site.
 *
 * The naive guard `next.startsWith('/') && !next.startsWith('//')` is NOT
 * enough: for a special scheme (http/https) the WHATWG URL parser normalizes
 * a backslash to a slash, so `new URL('/<backslash>evil.com', 'https://site/')`
 * resolves to `https://evil.com/` — a protocol-relative escape the `//` check
 * never sees. We therefore (1) reject any value that isn't a clean single-slash
 * path with no backslash or control char, and (2) resolve it against the site
 * origin and confirm the origin is unchanged. Either check alone closes the
 * known bypasses; both together are the belt-and-suspenders.
 */

const BACKSLASH = 92; // '\' — the WHATWG parser normalizes it to '/'.

/** True if `s` holds a backslash or any C0/DEL control char. */
function hasUnsafeChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === BACKSLASH || c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

/**
 * Returns a guaranteed same-origin relative path (`/path?query#hash`) derived
 * from `raw`, or `fallback` when `raw` is missing, off-site, or malformed.
 * `base` is any absolute URL on our origin (e.g. the request URL).
 */
export function safeNextPath(
  raw: string | null | undefined,
  base: string,
  fallback = '/',
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || hasUnsafeChar(raw)) {
    return fallback;
  }
  try {
    const resolved = new URL(raw, base);
    if (resolved.origin !== new URL(base).origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
