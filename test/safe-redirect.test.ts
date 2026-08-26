import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-redirect';

const BASE = 'https://www.technomanagers.in/auth';

describe('safeNextPath — same-origin guarantee', () => {
  it('passes clean internal paths through, preserving query and hash', () => {
    expect(safeNextPath('/profile', BASE)).toBe('/profile');
    expect(safeNextPath('/questions?role=PM&sort=Hot', BASE)).toBe('/questions?role=PM&sort=Hot');
    expect(safeNextPath('/questions/company/mckinsey', BASE)).toBe('/questions/company/mckinsey');
    expect(safeNextPath('/questions/a#comment-1', BASE)).toBe('/questions/a#comment-1');
  });

  it('falls back for missing or empty input', () => {
    expect(safeNextPath(null, BASE)).toBe('/');
    expect(safeNextPath(undefined, BASE)).toBe('/');
    expect(safeNextPath('', BASE)).toBe('/');
    expect(safeNextPath(null, BASE, '/questions')).toBe('/questions');
  });

  it('rejects the backslash open-redirect that a naive // check misses', () => {
    // new URL('/\\evil.com', base) resolves to https://evil.com/ — the core bug.
    expect(safeNextPath('/\\evil.com', BASE)).toBe('/');
    expect(safeNextPath('/\\/evil.com', BASE)).toBe('/');
    expect(safeNextPath('/\\\\evil.com', BASE)).toBe('/');
  });

  it('rejects protocol-relative and absolute off-site targets', () => {
    expect(safeNextPath('//evil.com', BASE)).toBe('/');
    expect(safeNextPath('https://evil.com', BASE)).toBe('/');
    expect(safeNextPath('http://evil.com/path', BASE)).toBe('/');
    expect(safeNextPath('javascript:alert(1)', BASE)).toBe('/');
    expect(safeNextPath('mailto:x@y.com', BASE)).toBe('/');
  });

  it('rejects non-slash and control-char smuggling', () => {
    expect(safeNextPath('profile', BASE)).toBe('/'); // no leading slash
    expect(safeNextPath('/foo\nSet-Cookie: x', BASE)).toBe('/'); // newline (CRLF injection)
    expect(safeNextPath('/foo\tbar', BASE)).toBe('/'); // tab
    expect(safeNextPath('/foo\x00bar', BASE)).toBe('/'); // NUL
  });

  it('never returns an off-origin result for any input (origin invariant)', () => {
    const vectors = ['/\\evil.com', '//evil.com', 'https://evil.com', '/\\/\\evil.com', '/%2F%2Fevil.com'];
    for (const v of vectors) {
      const out = safeNextPath(v, BASE);
      // Whatever comes back must resolve back onto our own origin.
      expect(new URL(out, BASE).origin).toBe('https://www.technomanagers.in');
    }
  });
});
