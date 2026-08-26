import Link from 'next/link';
import type { Metadata } from 'next';
import { hubHref } from '@/lib/hubs';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

// A few large, stable hubs to route lost visitors somewhere useful.
const SUGGESTED_HUBS: Array<{ label: string; href: string }> = [
  { label: 'Google questions', href: hubHref('company', 'Google') },
  { label: 'Product Sense questions', href: hubHref('category', 'Product Sense') },
  { label: 'Product Management questions', href: hubHref('role', 'Product Management') },
];

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p aria-hidden="true" className="text-6xl font-heading font-bold text-primary">404</p>
      <h1 className="text-2xl font-heading font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/questions"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Browse interview questions
      </Link>
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {SUGGESTED_HUBS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
