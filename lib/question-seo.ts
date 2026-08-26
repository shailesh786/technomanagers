/**
 * lib/question-seo.ts — <title>, meta description and JSON-LD for a question
 * detail page. Pure functions over the rows the route has fetched, so the
 * markup is unit-tested and the route only decides what to load.
 */

import type { Question } from '@/types';
import { hubHref } from '@/lib/hubs';
import type { Comment } from '@/lib/comments-query';

const SITE_NAME = 'Technomanagers';

export const TITLE_MAX_LENGTH = 70;
export const DESCRIPTION_MAX_LENGTH = 155;

/** Truncate long question text gracefully for the <title> tag. */
export function questionTitle(text: string, max: number = TITLE_MAX_LENGTH): string {
  // Word-boundary truncation — a mid-word chop ("How would you priorit…")
  // reads broken in the SERP. Falls back to a hard cut if the only boundary
  // is so early most of the budget would go unused.
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  const kept = boundary > max * 0.6 ? cut.slice(0, boundary) : cut;
  return `${kept.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/**
 * Collapse whitespace and cut at a word boundary, ending with an ellipsis when
 * shortened. Falls back to a hard cut if the only boundary is so early that
 * most of the budget would go unused.
 */
export function excerpt(text: string, max: number = DESCRIPTION_MAX_LENGTH): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1); // leave room for the ellipsis
  const boundary = cut.lastIndexOf(' ');
  const kept = boundary > max * 0.6 ? cut.slice(0, boundary) : cut;
  return `${kept.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

type DescriptionSource = Pick<Question, 'company' | 'difficulty' | 'sample_answer'>;

/**
 * The sample answer, when there is one, is the most specific description the
 * page can have — it is what the searcher is looking for. Otherwise the
 * template describes the question by company and difficulty.
 */
export function questionDescription(question: DescriptionSource): string {
  const answer = question.sample_answer?.trim();
  if (answer) return excerpt(answer);

  const companies = question.company?.filter(Boolean).join(', ');
  const difficulty = question.difficulty ?? 'N/A';
  return companies
    ? `PM interview question from ${companies}. Difficulty: ${difficulty}. Practice with real questions on ${SITE_NAME}.`
    : `PM interview question. Difficulty: ${difficulty}. Practice with real questions on ${SITE_NAME}.`;
}

/** JSON for a <script type="application/ld+json">, safe against `</script>` in content. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export interface QuestionJsonLdInput {
  question: Question;
  /** Top-level community answers that are in the HTML (first page). */
  comments: Comment[];
  /**
   * True total of community answers on the question (all pages, replies
   * included). Without it answerCount undercounts to the first page.
   */
  totalAnswerCount?: number | null;
  siteUrl: string;
}

/**
 * One graph with two nodes:
 *
 * - The page. Plain `WebPage` when there is nothing to answer with; `QAPage`
 *   (a WebPage subtype) once the page carries a sample answer or community
 *   answers, with the `Question` / `Answer` entities Google's Q&A rich result
 *   reads. The sample answer is the `acceptedAnswer` (authored by the site);
 *   community answers are `suggestedAnswer`s. When the sample answer exists it
 *   is also declared as metered paywall content — it is in the HTML but
 *   revealed behind the free-view gate, and `isAccessibleForFree` + `hasPart`
 *   is how that is stated rather than read as cloaking.
 * - `BreadcrumbList` — Home › Interview Questions › primary category › this
 *   question — mirroring the visible trail.
 */
export function questionJsonLd({ question, comments, totalAnswerCount, siteUrl }: QuestionJsonLdInput) {
  const url = `${siteUrl}/questions/${question.id}`;
  const site = { '@type': 'Organization', name: SITE_NAME, url: siteUrl };
  const sampleAnswer = question.sample_answer?.trim();

  const suggestedAnswer = comments
    .filter((c) => c.content?.trim())
    .map((c) => ({
      '@type': 'Answer',
      text: c.content,
      url: `${url}#comment-${c.id}`,
      ...(c.created_at ? { dateCreated: c.created_at } : {}),
      author: { '@type': 'Person', name: c.profile?.full_name?.trim() || 'Community member' },
    }));

  const answerCount = Math.max(suggestedAnswer.length, totalAnswerCount ?? 0) + (sampleAnswer ? 1 : 0);

  const page = {
    '@type': answerCount > 0 ? 'QAPage' : 'WebPage',
    '@id': url,
    url,
    name: question.question_text,
    ...(question.updated_at ? { dateModified: question.updated_at } : {}),
    ...(sampleAnswer
      ? {
          isAccessibleForFree: false,
          hasPart: {
            '@type': 'WebPageElement',
            isAccessibleForFree: false,
            cssSelector: '.question-answer',
          },
        }
      : {}),
    ...(answerCount > 0
      ? {
          mainEntity: {
            '@type': 'Question',
            name: question.question_text,
            text: question.question_text,
            answerCount,
            upvoteCount: question.upvotes ?? 0,
            ...(question.created_at ? { dateCreated: question.created_at } : {}),
            author: site,
            ...(sampleAnswer
              ? {
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: sampleAnswer,
                    url: `${url}#sample-answer`,
                    author: site,
                  },
                }
              : {}),
            ...(suggestedAnswer.length ? { suggestedAnswer } : {}),
          },
        }
      : {}),
  };

  const primaryCategory = question.category?.[0]?.trim();
  const crumbs = [
    { name: 'Home', item: siteUrl },
    { name: 'Interview Questions', item: `${siteUrl}/questions` },
    ...(primaryCategory
      ? [{ name: primaryCategory, item: `${siteUrl}${hubHref('category', primaryCategory)}` }]
      : []),
    { name: question.question_text, item: url },
  ];
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };

  return { '@context': 'https://schema.org', '@graph': [page, breadcrumb] };
}
