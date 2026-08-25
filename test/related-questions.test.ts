import { describe, expect, it } from 'vitest';
import {
  buildClusters,
  categoryHref,
  companyHref,
  primaryCategory,
  primaryCompany,
  viewAllLabel,
  CATEGORY_CLUSTER_SIZE,
  COMPANY_CLUSTER_SIZE,
  TRENDING_CLUSTER_SIZE,
  VIEW_ALL_COUNT_THRESHOLD,
} from '@/lib/related-questions';
import type { Question } from '@/types';

const q = (id: string, over: Partial<Question> = {}): Question => ({
  id,
  question_text: `Question ${id}`,
  company: null,
  category: null,
  tags: null,
  difficulty: 'Medium',
  role: null,
  sample_answer: null,
  status: 'published',
  upvotes: 0,
  created_at: null,
  updated_at: null,
  ...over,
});

const current = { id: 'self', company: ['Google', 'Meta'], category: ['Product Sense', 'Analytical'] };
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('primaryCategory / primaryCompany', () => {
  it('use the first tag and ignore empty values', () => {
    expect(primaryCategory(current)).toBe('Product Sense');
    expect(primaryCompany(current)).toBe('Google');
    expect(primaryCategory({ category: ['  '] })).toBeNull();
    expect(primaryCompany({ company: null })).toBeNull();
  });
});

describe('viewAllLabel', () => {
  it('shows the count only once a hub is big enough to be worth advertising', () => {
    expect(viewAllLabel(null)).toBe('View all');
    expect(viewAllLabel(VIEW_ALL_COUNT_THRESHOLD - 1)).toBe('View all');
    expect(viewAllLabel(VIEW_ALL_COUNT_THRESHOLD)).toBe(`View all ${VIEW_ALL_COUNT_THRESHOLD}`);
    expect(viewAllLabel(128)).toBe('View all 128');
  });
});

describe('hrefs', () => {
  it('resolve to the hub pages', () => {
    expect(categoryHref('Product Sense')).toBe('/questions/category/product-sense');
    expect(companyHref('A&M')).toBe('/questions/company/a-m');
  });
});

describe('buildClusters', () => {
  it('builds a category cluster then a company cluster, capped at three and two', () => {
    const byCategory = ['c1', 'c2', 'c3', 'c4'].map((id) => q(id));
    const byCompany = ['g1', 'g2', 'g3'].map((id) => q(id));
    const clusters = buildClusters({ question: current, byCategory, categoryTotal: 12, byCompany, companyTotal: 14 });

    expect(clusters.map((c) => c.kind)).toEqual(['category', 'company']);
    expect(clusters[0]).toMatchObject({
      heading: 'More Product Sense Questions',
      viewAllHref: '/questions/category/product-sense',
      total: 12,
    });
    expect(ids(clusters[0].items)).toEqual(['c1', 'c2', 'c3']);
    expect(clusters[0].items).toHaveLength(CATEGORY_CLUSTER_SIZE);
    expect(clusters[1]).toMatchObject({
      heading: 'More Questions Asked at Google',
      viewAllHref: '/questions/company/google',
      total: 14,
    });
    expect(ids(clusters[1].items)).toEqual(['g1', 'g2']);
    expect(clusters[1].items).toHaveLength(COMPANY_CLUSTER_SIZE);
  });

  it('never repeats a question across clusters and never includes the current one', () => {
    const shared = q('shared');
    const clusters = buildClusters({
      question: current,
      byCategory: [q('self'), shared, q('c2')],
      categoryTotal: null,
      byCompany: [shared, q('self'), q('g2'), q('g3')],
      companyTotal: null,
    });
    expect(ids(clusters[0].items)).toEqual(['shared', 'c2']);
    expect(ids(clusters[1].items)).toEqual(['g2', 'g3']);
  });

  it('hides a cluster with nothing in it', () => {
    const clusters = buildClusters({
      question: current,
      byCategory: [q('c1')],
      categoryTotal: 2,
      byCompany: [],
      companyTotal: 1,
    });
    expect(clusters.map((c) => c.kind)).toEqual(['category']);
  });

  it('skips a cluster whose tag the question does not carry', () => {
    const clusters = buildClusters({
      question: { id: 'self', company: null, category: ['Analytical'] },
      byCategory: [q('c1')],
      categoryTotal: null,
      byCompany: [q('g1')],
      companyTotal: null,
    });
    expect(clusters.map((c) => c.kind)).toEqual(['category']);
  });

  it('falls back to trending only when both clusters are empty', () => {
    const trending = ['t1', 't2', 't3', 't4', 't5', 't6'].map((id) => q(id));
    const fallback = buildClusters({
      question: current,
      byCategory: [],
      categoryTotal: 0,
      byCompany: [q('self')],
      companyTotal: 1,
      trending,
    });
    expect(fallback).toHaveLength(1);
    expect(fallback[0]).toMatchObject({ kind: 'trending', heading: 'Trending Questions', viewAllHref: '/questions', total: null });
    expect(fallback[0].items).toHaveLength(TRENDING_CLUSTER_SIZE);

    const withCategory = buildClusters({
      question: current,
      byCategory: [q('c1')],
      categoryTotal: 2,
      byCompany: [],
      companyTotal: 1,
      trending,
    });
    expect(withCategory.map((c) => c.kind)).toEqual(['category']);
  });

  it('returns nothing for an untagged question with no trending pool', () => {
    expect(buildClusters({ question: { id: 'x', company: null, category: null }, byCategory: [], categoryTotal: null, byCompany: [], companyTotal: null })).toEqual([]);
  });
});
