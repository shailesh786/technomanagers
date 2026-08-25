import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RelatedQuestions from '@/components/questions/RelatedQuestions';
import type { RelatedCluster } from '@/lib/related-questions';
import type { Question } from '@/types';

const { access, router, state, toast } = vi.hoisted(() => ({
  access: { recordView: vi.fn(() => true), isExhausted: false, setGateOpen: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn() },
  state: { user: null as null | { id: string } },
  toast: { info: vi.fn(), success: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/contexts/QuestionAccessContext', () => ({ useQuestionAccess: () => access }));
vi.mock('@/hooks/useQuestions', () => ({
  useSavedQuestions: () => ({ data: ['g1'] }),
  useSaveQuestion: () => ({ mutate: vi.fn() }),
  useUnsaveQuestion: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/useLikes', () => ({
  useUserLikedQuestionIds: () => ({ data: new Set<string>() }),
  useToggleLike: () => ({ mutate: vi.fn() }),
}));

const q = (id: string, text: string, over: Partial<Question> = {}): Question => ({
  id,
  question_text: text,
  company: ['Google'],
  category: ['Execution'],
  tags: null,
  difficulty: 'Medium',
  role: null,
  sample_answer: null,
  status: 'published',
  upvotes: 3,
  created_at: null,
  updated_at: null,
  comment_count: 1,
  ...over,
});

const clusters: RelatedCluster[] = [
  {
    kind: 'category',
    heading: 'More Execution Questions',
    viewAllHref: '/questions/category/execution',
    total: 6,
    items: [q('c1', 'How do you prioritise across competing workstreams?'), q('c2', 'How would you ship with half the team?')],
  },
  {
    kind: 'company',
    heading: 'More Questions Asked at Google',
    viewAllHref: '/questions/company/google',
    total: 14,
    items: [q('g1', 'How would you improve Google Meet for hybrid teams?')],
  },
];

const neighbours = {
  prev: { id: 'p1', question_text: 'Previous one' },
  next: { id: 'n1', question_text: 'Next one' },
};

beforeEach(() => {
  access.recordView.mockClear().mockReturnValue(true);
  router.push.mockClear();
  toast.info.mockClear();
  state.user = null;
});

describe('RelatedQuestions', () => {
  it('renders each cluster as a labelled section with its cards linking to the questions', () => {
    render(<RelatedQuestions clusters={clusters} neighbours={neighbours} />);
    const category = screen.getByRole('region', { name: 'More Execution Questions' });
    const company = screen.getByRole('region', { name: 'More Questions Asked at Google' });

    // A card also links to its own comments (#comments-section); the body link is the one without a hash.
    const cardHrefs = (section: HTMLElement) =>
      within(section)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) => /^\/questions\/[^/#]+$/.test(h)); // question links only — no hub View-all, no #comments anchors
    expect(cardHrefs(category)).toEqual(['/questions/c1', '/questions/c2']);
    expect(cardHrefs(company)).toEqual(['/questions/g1']);
    expect(within(category).getAllByText('Asked at Google')).toHaveLength(2);
  });

  it('shows "View all" with a count only for hubs at or above the threshold', () => {
    render(<RelatedQuestions clusters={clusters} neighbours={neighbours} />);
    const category = screen.getByRole('region', { name: 'More Execution Questions' });
    const company = screen.getByRole('region', { name: 'More Questions Asked at Google' });
    expect(within(category).getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/questions/category/execution');
    expect(within(company).getByRole('link', { name: 'View all 14' })).toHaveAttribute('href', '/questions/company/google');
  });

  it('renders previous/next links that pass through the free-view gate before routing', () => {
    render(<RelatedQuestions clusters={clusters} neighbours={neighbours} />);
    const nav = screen.getByRole('navigation', { name: /previous and next question/i });
    const prev = within(nav).getByRole('link', { name: /previous question.*Previous one/i });
    const next = within(nav).getByRole('link', { name: /next question.*Next one/i });
    expect(prev).toHaveAttribute('href', '/questions/p1');
    expect(prev).toHaveAttribute('rel', 'prev');
    expect(next).toHaveAttribute('href', '/questions/n1');
    expect(next).toHaveAttribute('rel', 'next');

    fireEvent.click(next);
    expect(access.recordView).toHaveBeenCalledWith('n1');
    expect(router.push).toHaveBeenCalledWith('/questions/n1');

    access.recordView.mockReturnValue(false);
    fireEvent.click(prev);
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('renders only the side that exists and keeps the layout slot for the other', () => {
    render(<RelatedQuestions clusters={[]} neighbours={{ prev: null, next: neighbours.next }} />);
    const nav = screen.getByRole('navigation', { name: /previous and next question/i });
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('renders nothing at all with no clusters and no neighbours', () => {
    const { container } = render(<RelatedQuestions clusters={[]} neighbours={{ prev: null, next: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks a signed-out visitor to sign in when they use a card footer action', () => {
    render(<RelatedQuestions clusters={clusters} neighbours={neighbours} />);
    const category = screen.getByRole('region', { name: 'More Execution Questions' });
    fireEvent.click(within(category).getAllByRole('button', { name: /upvote/i })[0]);
    expect(toast.info).toHaveBeenCalledWith('Sign in to upvote');
  });
});
