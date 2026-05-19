/**
 * app/questions/[id]/page.tsx — Question detail (Server Component shell)
 *
 * Passes the `id` param from the URL to QuestionDetailClient so the
 * client component doesn't need useParams().
 */

import QuestionDetailClient from '@/components/questions/QuestionDetailClient';

interface Props {
  params: { id: string };
}

export default function QuestionDetailPage({ params }: Props) {
  return <QuestionDetailClient id={params.id} />;
}
