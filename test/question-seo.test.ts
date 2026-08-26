import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_MAX_LENGTH,
  excerpt,
  questionDescription,
  questionJsonLd,
  questionTitle,
  serializeJsonLd,
} from '@/lib/question-seo';
import type { Comment } from '@/lib/comments-query';
import type { Question } from '@/types';

const question: Question = {
  id: 'q1',
  question_text: "Walk me through how you'd handle a project that's behind schedule.",
  company: ['Amazon', 'Meta'],
  category: ['Program Management'],
  tags: null,
  difficulty: 'Medium',
  role: null,
  sample_answer: null,
  status: 'published',
  upvotes: 4,
  created_at: '2026-04-12T13:19:07+00:00',
  updated_at: null,
};

const comment = (id: string, over: Partial<Comment> = {}): Comment => ({
  id,
  question_id: 'q1',
  user_id: 'u1',
  parent_id: null,
  content: `Answer ${id}`,
  created_at: '2026-05-01T00:00:00+00:00',
  updated_at: '2026-05-01T00:00:00+00:00',
  profile: { full_name: 'Sai Phaneendra', avatar_url: null },
  like_count: 0,
  user_liked: false,
  ...over,
});

const SITE = 'https://www.technomanagers.in';
const graph = (q: Question, comments: Comment[] = [], totalAnswerCount?: number | null) =>
  questionJsonLd({ question: q, comments, totalAnswerCount, siteUrl: SITE })['@graph'];

describe('questionTitle', () => {
  it('truncates at a word boundary, dropping trailing punctuation', () => {
    const text = 'How would you improve the onboarding funnel for a subscription product in a mature market today?';
    const out = questionTitle(text);
    expect(out.length).toBeLessThanOrEqual(71);
    expect(out).toBe('How would you improve the onboarding funnel for a subscription…');
  });

  it('leaves short text alone and truncates long text with an ellipsis', () => {
    expect(questionTitle('Short question?')).toBe('Short question?');
    const long = 'x'.repeat(80);
    expect(questionTitle(long)).toBe(`${'x'.repeat(70)}…`);
    expect(questionTitle('word '.repeat(20))).toMatch(/\S…$/);
  });
});

describe('excerpt', () => {
  it('collapses whitespace and returns short text unchanged', () => {
    expect(excerpt('Step 1.\n\nClarify   the drop.')).toBe('Step 1. Clarify the drop.');
  });

  it('cuts at a word boundary within the budget, dropping trailing punctuation', () => {
    const text = 'Start by re-baselining the plan, find the critical path, then cut scope before adding people, and tell stakeholders early.';
    const out = excerpt(text, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
    expect(out).toBe('Start by re-baselining the plan, find the critical path…');
  });

  it('hard-cuts when there is no usable word boundary', () => {
    const out = excerpt('a'.repeat(200), 20);
    expect(out).toBe(`${'a'.repeat(19)}…`);
  });
});

describe('questionDescription', () => {
  it('uses the sample answer when there is one, within the meta-description budget', () => {
    const answer = 'Re-baseline the plan first. '.repeat(20);
    const out = questionDescription({ ...question, sample_answer: answer });
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(out.startsWith('Re-baseline the plan first.')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  it('falls back to the company/difficulty template, with and without companies', () => {
    expect(questionDescription(question)).toBe(
      'PM interview question from Amazon, Meta. Difficulty: Medium. Practice with real questions on Technomanagers.',
    );
    expect(questionDescription({ ...question, company: null, difficulty: null })).toBe(
      'PM interview question. Difficulty: N/A. Practice with real questions on Technomanagers.',
    );
  });

  it('treats a whitespace-only answer as absent', () => {
    expect(questionDescription({ ...question, sample_answer: '   \n ' })).toMatch(/^PM interview question from/);
  });
});

describe('questionJsonLd', () => {
  it('emits a plain WebPage plus breadcrumbs when there is nothing to answer with', () => {
    const [page, breadcrumb] = graph(question);
    expect(page).toMatchObject({ '@type': 'WebPage', url: `${SITE}/questions/q1`, name: question.question_text });
    expect(page).not.toHaveProperty('mainEntity');
    expect(page).not.toHaveProperty('isAccessibleForFree');
    expect(breadcrumb).toMatchObject({ '@type': 'BreadcrumbList' });
    expect((breadcrumb as { itemListElement: { position: number; name: string; item: string }[] }).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Interview Questions', item: `${SITE}/questions` },
      { '@type': 'ListItem', position: 3, name: 'Program Management', item: `${SITE}/questions/category/program-management` },
      { '@type': 'ListItem', position: 4, name: question.question_text, item: `${SITE}/questions/q1` },
    ]);
  });

  it('omits the category crumb for an uncategorised question', () => {
    const [, breadcrumb] = graph({ ...question, category: null });
    expect((breadcrumb as { itemListElement: unknown[] }).itemListElement).toHaveLength(3);
  });

  it('becomes a QAPage with the sample answer as the accepted answer, declared as paywalled', () => {
    const [page] = graph({ ...question, sample_answer: 'Re-baseline first.' }) as Record<string, unknown>[];
    expect(page['@type']).toBe('QAPage');
    expect(page).toMatchObject({
      isAccessibleForFree: false,
      hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.question-answer' },
      mainEntity: {
        '@type': 'Question',
        answerCount: 1,
        upvoteCount: 4,
        dateCreated: question.created_at,
        acceptedAnswer: { '@type': 'Answer', text: 'Re-baseline first.', url: `${SITE}/questions/q1#sample-answer` },
      },
    });
    expect(page.mainEntity).not.toHaveProperty('suggestedAnswer');
  });

  it('lists community answers as suggested answers with their author, anchor and date', () => {
    const comments = [comment('c1'), comment('c2', { profile: { full_name: '  ', avatar_url: null } }), comment('c3', { content: '   ' })];
    const [page] = graph(question, comments) as Record<string, unknown>[];
    const entity = page.mainEntity as { answerCount: number; suggestedAnswer: Record<string, unknown>[] };
    expect(page['@type']).toBe('QAPage');
    expect(page).not.toHaveProperty('isAccessibleForFree');
    expect(entity.answerCount).toBe(2);
    expect(entity.suggestedAnswer).toEqual([
      { '@type': 'Answer', text: 'Answer c1', url: `${SITE}/questions/q1#comment-c1`, dateCreated: comments[0].created_at, author: { '@type': 'Person', name: 'Sai Phaneendra' } },
      { '@type': 'Answer', text: 'Answer c2', url: `${SITE}/questions/q1#comment-c2`, dateCreated: comments[1].created_at, author: { '@type': 'Person', name: 'Community member' } },
    ]);
  });

  it('counts both the sample answer and community answers', () => {
    const [page] = graph({ ...question, sample_answer: 'Yes.' }, [comment('c1')]) as Record<string, unknown>[];
    expect((page.mainEntity as { answerCount: number }).answerCount).toBe(2);
  });

  it('uses the true total when it exceeds the first page of community answers', () => {
    const [page] = graph({ ...question, sample_answer: 'Yes.' }, [comment('c1'), comment('c2')], 27) as Record<string, unknown>[];
    // 27 total community answers + 1 sample answer, not just the 2 on page 1.
    expect((page.mainEntity as { answerCount: number }).answerCount).toBe(28);
  });

  it('falls back to the page-1 count when the total is null or smaller', () => {
    const [withNull] = graph(question, [comment('c1')], null) as Record<string, unknown>[];
    expect((withNull.mainEntity as { answerCount: number }).answerCount).toBe(1);
    const [withSmaller] = graph(question, [comment('c1'), comment('c2')], 1) as Record<string, unknown>[];
    expect((withSmaller.mainEntity as { answerCount: number }).answerCount).toBe(2);
  });

  it('stays a plain WebPage when the total is zero and there is nothing else to answer with', () => {
    const [page] = graph(question, [], 0) as Record<string, unknown>[];
    expect(page['@type']).toBe('WebPage');
    expect(page).not.toHaveProperty('mainEntity');
  });

  it('carries dateModified from updated_at, omitted when absent', () => {
    const [withDate] = graph({ ...question, updated_at: '2026-08-01T00:00:00+00:00' });
    expect(withDate).toMatchObject({ dateModified: '2026-08-01T00:00:00+00:00' });
    const [without] = graph(question);
    expect(without).not.toHaveProperty('dateModified');
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so content cannot close the script element', () => {
    const out = serializeJsonLd({ text: 'a </script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out)).toEqual({ text: 'a </script><script>alert(1)</script>' });
  });
});
