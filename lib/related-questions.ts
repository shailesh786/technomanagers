/**
 * lib/related-questions.ts — the "Related questions" clusters and the
 * previous/next pair on a question detail page.
 *
 * Pure selection over rows the server route has already fetched, so it is
 * unit-testable and the route stays a thin data-loader. The shape follows the
 * approved design: up to three questions from the same category, then up to
 * two asked at the same company, each cluster with a "View all" link into its
 * hub. A page with neither falls back to trending questions so no question is
 * a dead end for a crawler or a reader.
 */

import type { Question } from '@/types';

export const CATEGORY_CLUSTER_SIZE = 3;
export const COMPANY_CLUSTER_SIZE = 2;
export const TRENDING_CLUSTER_SIZE = 5;

/**
 * Below this many questions in a hub, "View all 6" reads as thin rather than
 * inviting; the link still exists, just without the number.
 */
export const VIEW_ALL_COUNT_THRESHOLD = 10;

export type RelatedClusterKind = 'category' | 'company' | 'trending';

export interface RelatedCluster {
  kind: RelatedClusterKind;
  heading: string;
  viewAllHref: string;
  /** Published questions in the hub (current one included); null when unknown. */
  total: number | null;
  items: Question[];
}

export type NeighbourQuestion = Pick<Question, 'id' | 'question_text'>;

export interface QuestionNeighbours {
  /** The next newer question, as read top-down on the newest-first list. */
  prev: NeighbourQuestion | null;
  /** The next older question. */
  next: NeighbourQuestion | null;
}

type Tagged = Pick<Question, 'id' | 'company' | 'category'>;

/** The category a question is filed under for headings, breadcrumbs and its cluster. */
export function primaryCategory(question: Pick<Question, 'category'>): string | null {
  return question.category?.[0]?.trim() || null;
}

export function primaryCompany(question: Pick<Question, 'company'>): string | null {
  return question.company?.[0]?.trim() || null;
}

export const categoryHref = (category: string) => `/questions?category=${encodeURIComponent(category)}`;
export const companyHref = (company: string) => `/questions?company=${encodeURIComponent(company)}`;

export function viewAllLabel(total: number | null): string {
  return total !== null && total >= VIEW_ALL_COUNT_THRESHOLD ? `View all ${total}` : 'View all';
}

export interface ClusterInput {
  question: Tagged;
  /** Published questions sharing the primary category, best first. */
  byCategory: Question[];
  categoryTotal: number | null;
  /** Published questions sharing the primary company, best first. */
  byCompany: Question[];
  companyTotal: number | null;
  /** Fallback pool, best first; only used when both clusters come out empty. */
  trending?: Question[];
}

export function buildClusters(input: ClusterInput): RelatedCluster[] {
  const { question } = input;
  // A question appears at most once across the page, and never links to itself.
  const taken = new Set<string>([question.id]);
  const take = (rows: Question[], limit: number): Question[] => {
    const out: Question[] = [];
    for (const row of rows) {
      if (taken.has(row.id)) continue;
      taken.add(row.id);
      out.push(row);
      if (out.length === limit) break;
    }
    return out;
  };

  const clusters: RelatedCluster[] = [];

  const category = primaryCategory(question);
  if (category) {
    const items = take(input.byCategory, CATEGORY_CLUSTER_SIZE);
    if (items.length) {
      clusters.push({
        kind: 'category',
        heading: `More ${category} Questions`,
        viewAllHref: categoryHref(category),
        total: input.categoryTotal,
        items,
      });
    }
  }

  const company = primaryCompany(question);
  if (company) {
    const items = take(input.byCompany, COMPANY_CLUSTER_SIZE);
    if (items.length) {
      clusters.push({
        kind: 'company',
        heading: `More Questions Asked at ${company}`,
        viewAllHref: companyHref(company),
        total: input.companyTotal,
        items,
      });
    }
  }

  if (!clusters.length && input.trending?.length) {
    const items = take(input.trending, TRENDING_CLUSTER_SIZE);
    if (items.length) {
      clusters.push({
        kind: 'trending',
        heading: 'Trending Questions',
        viewAllHref: '/questions',
        total: null,
        items,
      });
    }
  }

  return clusters;
}
