/**
 * app/questions/[id]/page.tsx — Question detail  (/questions/:id)
 *
 * Rendering: SSR (React Server Component)
 *
 * Phase 2: Replace this stub with the migrated <QuestionDetail /> component.
 * The RSC will:
 *  1. Fetch the individual question by ID from Supabase (server-side)
 *  2. Return notFound() if the question doesn't exist or isn't published
 *  3. Pass data as props to interactive client sub-components (comments, likes)
 *
 * SEO: generateMetadata (with per-question og:title/description) in Phase 5.
 */

import { notFound } from 'next/navigation';

interface QuestionDetailPageProps {
  params: { id: string };
}

export default function QuestionDetailPage({ params }: QuestionDetailPageProps) {
  if (!params.id) notFound();

  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-heading font-bold">
        🚧 Question Detail — Phase 2 migration pending
      </h1>
      <p className="mt-4 text-muted-foreground">
        Question ID: <code className="font-mono">{params.id}</code>
      </p>
    </div>
  );
}
