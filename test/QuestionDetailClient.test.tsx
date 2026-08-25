import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import QuestionDetailClient from '@/components/questions/QuestionDetailClient';
import type { RelatedCluster } from '@/lib/related-questions';
import type { Question } from '@/types';

// vi.mock factories are hoisted above imports, so anything they close over
// has to be created with vi.hoisted.
const { access, state } = vi.hoisted(() => ({
  access: { recordView: vi.fn(() => true), isExhausted: false, setGateOpen: vi.fn() },
  state: { user: null as null | { id: string } },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/contexts/QuestionAccessContext', () => ({ useQuestionAccess: () => access }));
vi.mock('@/hooks/useLikes', () => ({
  useUserLikedQuestion: () => ({ data: false }),
  useToggleQuestionLike: () => ({ mutate: vi.fn() }),
  useUserLikedQuestionIds: () => ({ data: new Set<string>() }),
  useToggleLike: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/useComments', () => ({ useCommentCount: () => ({ data: 0 }) }));
// Stand-in for the community answers so the DOM order around them can be asserted.
vi.mock('@/components/questions/CommentsSection', () => ({ default: () => <div data-testid="comments" /> }));

const question = {
  id: 'q1',
  question_text: "Walk me through how you'd handle a project that's behind schedule.",
  company: ['Amazon', 'Meta'],
  category: ['Program Management'],
  tags: null,
  difficulty: 'Medium',
  role: null,
  sample_answer: 'Start by re-baselining the plan: find the critical path, then cut scope before adding people.',
  status: 'published',
  upvotes: 4,
  created_at: null,
  updated_at: null,
};

vi.mock('@/hooks/useQuestions', () => ({
  useQuestion: () => ({ data: question, isLoading: false }),
  useSavedQuestions: () => ({ data: [] }),
  useSaveQuestion: () => ({ mutate: vi.fn() }),
  useUnsaveQuestion: () => ({ mutate: vi.fn() }),
}));

const relatedRow = (id: string, question_text: string): Question => ({
  id,
  question_text,
  company: ['Meta'],
  category: ['Program Management'],
  tags: null,
  difficulty: 'Medium',
  role: null,
  sample_answer: null,
  status: 'published',
  upvotes: 2,
  created_at: null,
  updated_at: null,
  comment_count: 0,
});

const clusters: RelatedCluster[] = [
  {
    kind: 'category',
    heading: 'More Program Management Questions',
    viewAllHref: '/questions/category/program-management',
    total: 2,
    items: [relatedRow('r1', 'Tell me about a time you influenced without authority.')],
  },
  {
    kind: 'company',
    heading: 'More Questions Asked at Amazon',
    viewAllHref: '/questions/company/amazon',
    total: 5,
    items: [relatedRow('r2', 'How do you handle disagreements with engineering?')],
  },
];

const neighbours = { prev: { id: 'p1', question_text: 'Previous' }, next: null };

const renderPage = (related: RelatedCluster[] = clusters) =>
  render(
    <TooltipProvider>
      <QuestionDetailClient id="q1" clusters={related} neighbours={neighbours} />
    </TooltipProvider>,
  );

beforeEach(() => {
  access.isExhausted = false;
  access.setGateOpen.mockClear();
  state.user = null;
});

describe('QuestionDetailClient — content in the HTML', () => {
  it('renders the sample answer into the DOM, collapsed, and reveals it on click', () => {
    renderPage();
    const answer = screen.getByText(question.sample_answer);
    expect(answer).not.toBeVisible();
    expect(answer).toHaveClass('question-answer');

    const toggle = screen.getByRole('button', { name: /show answer/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText(question.sample_answer)).toBeVisible();
    expect(screen.getByRole('button', { name: /hide answer/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the answer hidden and opens the sign-in gate once free views are exhausted', () => {
    access.isExhausted = true;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(access.setGateOpen).toHaveBeenCalledWith(true);
    expect(screen.getByText(question.sample_answer)).not.toBeVisible();
  });

  it('links company badges and category chips to the filtered list', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Amazon' })).toHaveAttribute('href', '/questions/company/amazon');
    expect(screen.getByRole('link', { name: 'Meta' })).toHaveAttribute('href', '/questions/company/meta');
    // The category appears twice — breadcrumb and chip — and both must point at the filter.
    const categoryLinks = screen.getAllByRole('link', { name: 'Program Management' });
    expect(categoryLinks).toHaveLength(2);
    for (const link of categoryLinks) {
      expect(link).toHaveAttribute('href', '/questions/category/program-management');
    }
  });

  it('shows a breadcrumb trail Home › Questions › category › this question', () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const links = within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toEqual([
      ['Home', '/'],
      ['Questions', '/questions'],
      ['Program Management', '/questions/category/program-management'],
    ]);
    expect(within(nav).getByText(question.question_text)).toHaveAttribute('aria-current', 'page');
  });

  it('renders the related clusters and pager below the community answers, after the sample answer', () => {
    renderPage();
    const answer = screen.getByText(question.sample_answer);
    const comments = screen.getByTestId('comments');
    const category = screen.getByRole('region', { name: 'More Program Management Questions' });
    const company = screen.getByRole('region', { name: 'More Questions Asked at Amazon' });
    const pager = screen.getByRole('navigation', { name: /previous and next question/i });

    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(answer, comments)).toBe(true);
    expect(before(comments, category)).toBe(true);
    expect(before(category, company)).toBe(true);
    expect(before(company, pager)).toBe(true);

    expect(within(category).getByRole('link', { name: /influenced without authority/ })).toHaveAttribute('href', '/questions/r1');
    expect(within(company).getByRole('link', { name: /disagreements with engineering/ })).toHaveAttribute('href', '/questions/r2');
    expect(within(pager).getByRole('link', { name: /previous question/i })).toHaveAttribute('href', '/questions/p1');
  });

  it('omits the clusters when there are none but keeps the pager', () => {
    renderPage([]);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('navigation', { name: /previous and next question/i })).toBeInTheDocument();
  });
});
