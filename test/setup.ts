import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// jsdom lacks Element.scrollTo and matchMedia — polyfill for the mobile
// slideshow (scroll-snap track) and prefers-reduced-motion checks.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo() {} as typeof Element.prototype.scrollTo;
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// next/image needs the Next.js runtime for optimization — render a plain img.
// `priority` is surfaced as data-priority so tests can assert LCP preloading.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, sizes, priority, ...rest } = props;
    return React.createElement('img', {
      ...(rest as React.ImgHTMLAttributes<HTMLImageElement>),
      ...(priority ? { 'data-priority': 'true' } : {}),
    });
  },
}));
