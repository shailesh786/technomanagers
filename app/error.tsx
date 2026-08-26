'use client';

/**
 * app/error.tsx — route error boundary. Renders inside the root layout
 * (Navbar/Footer stay up), so a data or render error shows a branded
 * recovery card instead of a blank screen.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center py-16">
      <h1 className="text-2xl font-heading font-bold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        An unexpected error stopped this page from loading. It's usually temporary.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/questions"
          className="inline-flex items-center justify-center rounded-md border px-6 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Browse questions
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md border px-6 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
