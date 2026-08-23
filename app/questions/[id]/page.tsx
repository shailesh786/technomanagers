/**
 * app/questions/[id]/page.tsx — Question detail (Server Component)
 *
 * ISR, revalidate = 60: served from the Vercel CDN and rebuilt in the
 * background. The route reads no request-time input — no cookies(), no
 * searchParams — which is what makes that true. (It used to take
 * `searchParams` for an admin `?preview=1` mode; in Next 14 reading
 * searchParams opts the whole route into per-request rendering, so
 * `revalidate` was silently ignored and every visit and every crawl was a
 * full server render with `no-store` headers. Draft preview now lives at
 * /questions/[id]/preview, which is dynamic on purpose.)
 *
 * Everything a crawler should see is in the HTML:
 *   - the question, its tags and breadcrumbs;
 *   - the sample answer, present but collapsed (revealed client-side);
 *   - the first page of community answers, prefetched into the same query
 *     key CommentsSection reads (see lib/comments-query.ts);
 *   - the related clusters and previous/next links (lib/related-questions.ts);
 *   - BreadcrumbList + QAPage / paywall JSON-LD (lib/question-seo.ts).
 *
 * React.cache() deduplicates the question fetch between generateMetadata and
 * the page within a single render.
 */

import { cache } from 'react';
import { notFound } from 'next/navigation';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import QuestionDetailClient from '@/components/questions/QuestionDetailClient';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { QUESTION_LIST_SELECT, flattenCommentCount } from '@/lib/question-list-select';
import {
  CATEGORY_CLUSTER_SIZE,
  COMPANY_CLUSTER_SIZE,
  TRENDING_CLUSTER_SIZE,
  buildClusters,
  primaryCategory,
  primaryCompany,
  type QuestionNeighbours,
  type RelatedCluster,
} from '@/lib/related-questions';
import {
  commentCountQueryKey,
  commentsQueryKey,
  fetchCommentCount,
  fetchCommentsPage,
  nextCommentsPageParam,
  type CommentsPage,
} from '@/lib/comments-query';
import { questionDescription, questionJsonLd, questionTitle, serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';
import type { Question } from '@/types';

export const revalidate = 60;

/**
 * Prerender every published question at build time; `revalidate` keeps them
 * fresh afterwards and ids not in this list (questions published since the
 * last deploy) render on demand and are then cached the same way.
 */
export async function generateStaticParams() {
  const supabase = createSupabasePublicClient();
  const { data } = await supabase.from('questions').select('id').eq('status', 'published');
  return (data ?? []).map(({ id }) => ({ id: String(id) }));
}

interface Props {
  params: { id: string };
}

type PublicClient = ReturnType<typeof createSupabasePublicClient>;
type TagColumn = 'category' | 'company';

// PostgREST's code for ".single() matched zero rows" — the only error that
// means "this question does not exist (or is not published)".
const NO_ROWS = 'PGRST116';

// Cookieless client — only published questions are visible to anon via RLS,
// so an unpublished id reads as zero rows and falls through to notFound().
// Any other failure is thrown: a 500 is never cached, whereas a 404 from a
// transient outage would be served for the whole revalidate window.
const getPublishedQuestion = cache(async (id: string): Promise<Question | null> => {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  if (error) {
    if (error.code === NO_ROWS) return null;
    throw error;
  }
  return data as Question;
});

/**
 * Published questions carrying a tag, as list rows — the same shape the
 * /questions cards are fed, so QuestionCard renders them unchanged. Best first:
 * most upvoted, then newest.
 */
async function listByTag(
  supabase: PublicClient,
  column: TagColumn,
  value: string,
  excludeId: string,
  limit: number,
): Promise<Question[]> {
  const { data } = await supabase
    .from('questions')
    .select(QUESTION_LIST_SELECT)
    .eq('status', 'published')
    .neq('id', excludeId)
    .contains(column, [value])
    // count only non-deleted comments — must match useQuestions()/useCommentCount()
    .is('question_comments.deleted_at', null)
    .order('upvotes', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return flattenCommentCount(data ?? []) as unknown as Question[];
}

/** How many published questions the hub for this tag holds (the current one included). */
async function countByTag(supabase: PublicClient, column: TagColumn, value: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .contains(column, [value]);
  return error ? null : count;
}

async function listTrending(supabase: PublicClient, excludeId: string, limit: number): Promise<Question[]> {
  const { data } = await supabase
    .from('questions')
    .select(QUESTION_LIST_SELECT)
    .eq('status', 'published')
    .neq('id', excludeId)
    .is('question_comments.deleted_at', null)
    .order('upvotes', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return flattenCommentCount(data ?? []) as unknown as Question[];
}

/**
 * Neighbours in the newest-first order the /questions list uses, so walking
 * "next" from any question eventually visits every published one. Ties on
 * created_at are broken by id in both directions, which keeps the chain
 * deterministic between renders.
 */
async function getNeighbours(supabase: PublicClient, question: Question): Promise<QuestionNeighbours> {
  const at = question.created_at;
  if (!at) return { prev: null, next: null };

  const select = () => supabase.from('questions').select('id, question_text').eq('status', 'published');
  const [newer, older] = await Promise.all([
    select()
      .or(`created_at.gt.${at},and(created_at.eq.${at},id.gt.${question.id})`)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1),
    select()
      .or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${question.id})`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1),
  ]);
  return { prev: newer.data?.[0] ?? null, next: older.data?.[0] ?? null };
}

interface QuestionPageData {
  clusters: RelatedCluster[];
  neighbours: QuestionNeighbours;
  /** null when the comments read failed — the client then fetches as before. */
  comments: CommentsPage | null;
  commentCount: number | null;
}

const getQuestionPageData = cache(async (question: Question): Promise<QuestionPageData> => {
  const supabase = createSupabasePublicClient();
  const category = primaryCategory(question);
  const company = primaryCompany(question);

  const [byCategory, categoryTotal, byCompany, companyTotal, neighbours, comments, commentCount] =
    await Promise.all([
      category ? listByTag(supabase, 'category', category, question.id, CATEGORY_CLUSTER_SIZE) : [],
      category ? countByTag(supabase, 'category', category) : null,
      // Over-fetch so de-duplication against the category cluster cannot leave it short.
      company ? listByTag(supabase, 'company', company, question.id, COMPANY_CLUSTER_SIZE + CATEGORY_CLUSTER_SIZE) : [],
      company ? countByTag(supabase, 'company', company) : null,
      getNeighbours(supabase, question),
      // A failed read must not take the page down, and must not hydrate an
      // empty page either (the client would show "No answers yet" as truth).
      fetchCommentsPage(supabase, question.id, 'newest', 0).catch(() => null),
      fetchCommentCount(supabase, question.id).catch(() => null),
    ]);

  let clusters = buildClusters({ question, byCategory, categoryTotal, byCompany, companyTotal });
  if (!clusters.length) {
    const trending = await listTrending(supabase, question.id, TRENDING_CLUSTER_SIZE);
    clusters = buildClusters({ question, byCategory: [], categoryTotal: null, byCompany: [], companyTotal: null, trending });
  }

  return { clusters, neighbours, comments, commentCount };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const question = await getPublishedQuestion(params.id);
  if (!question) return { title: 'Question Not Found' };

  // No "| Technomanagers" suffix — the root layout's title.template appends it
  // to the <title> tag. og:title below doesn't use the template, so it stays bare.
  const title = questionTitle(question.question_text);
  const description = questionDescription(question);

  return {
    title,
    description,
    alternates: { canonical: `/questions/${params.id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/questions/${params.id}`,
    },
  };
}

export default async function QuestionDetailPage({ params }: Props) {
  // Return a real HTTP 404 for non-existent/unpublished questions. Without
  // this, dead URLs render an error shell with status 200 (a "soft 404") and
  // Google indexes them as thin content.
  const question = await getPublishedQuestion(params.id);
  if (!question) notFound();

  const { clusters, neighbours, comments, commentCount } = await getQuestionPageData(question);

  const queryClient = new QueryClient();
  // Prefetch keys must match the client hooks exactly: ['question', id],
  // commentsQueryKey(id, 'newest') and commentCountQueryKey(id).
  await queryClient.prefetchQuery({
    queryKey: ['question', params.id],
    queryFn: () => getPublishedQuestion(params.id),
  });
  if (comments) {
    await queryClient.prefetchInfiniteQuery({
      queryKey: commentsQueryKey(params.id, 'newest'),
      queryFn: async () => comments,
      initialPageParam: 0,
      getNextPageParam: nextCommentsPageParam,
    });
  }
  if (commentCount !== null) {
    await queryClient.prefetchQuery({
      queryKey: commentCountQueryKey(params.id),
      queryFn: async () => commentCount,
    });
  }

  const jsonLd = questionJsonLd({ question, comments: comments?.data ?? [], siteUrl: resolveSiteUrl() });

  return (
    <>
      <script
        type="application/ld+json"
        // Server-rendered from our own database rows; serializeJsonLd escapes
        // `<` so user-written comment text cannot close the script element.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <QuestionDetailClient id={params.id} clusters={clusters} neighbours={neighbours} />
      </HydrationBoundary>
    </>
  );
}
