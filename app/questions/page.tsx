/**
 * app/questions/page.tsx — Questions listing (Server Component shell)
 *
 * Wraps QuestionsClient in <Suspense> — required by Next.js App Router
 * whenever a client component uses useSearchParams().
 */

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import QuestionsClient from '@/components/questions/QuestionsClient';

function QuestionsLoading() {
  return (
    <div className="container py-8 space-y-4">
      <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 space-y-3">
          <div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<QuestionsLoading />}>
      <QuestionsClient />
    </Suspense>
  );
}
