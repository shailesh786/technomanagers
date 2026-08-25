import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import CommentItem from '@/components/questions/CommentItem';

// Radix dropdown/dialog primitives touch pointer-capture and observer APIs
// that jsdom doesn't implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || (ResizeObserverStub as unknown as typeof ResizeObserver);
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

// jsdom has no PointerEvent, so fireEvent.pointerDown would fall back to a
// plain Event without `button` — and Radix's trigger requires button === 0.
if (!window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, props: PointerEventInit = {}) {
      super(type, props);
      this.pointerId = props.pointerId ?? 1;
      this.pointerType = props.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// vi.mock factories are hoisted above imports, so anything they close over
// has to be created with vi.hoisted.
const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { rpc: vi.fn(), from: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => supabaseMock,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'viewer-1' },
    profile: { full_name: 'Vik Viewer', avatar_url: '' },
  }),
}));
vi.mock('@/contexts/QuestionAccessContext', () => ({
  useQuestionAccess: () => ({ setGateOpen: vi.fn() }),
}));
vi.mock('@/hooks/useComments', () => ({
  useCommentReplies: () => ({ data: [] }),
  useAddComment: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateComment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteComment: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useLikes', () => ({
  useCommentLikeCounts: () => ({ data: {} }),
  useUserLikedComments: () => ({ data: new Set<string>() }),
  useToggleCommentLike: () => ({ mutate: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseComment = {
  id: 'c1',
  user_id: 'author-1', // not the signed-in viewer → report menu is available
  content: 'This answer misses the point entirely.',
  created_at: '2026-08-20T10:00:00.000Z',
  parent_id: null,
  is_flagged: false,
  profile: { full_name: 'Asha Author', avatar_url: '' },
};

const renderItem = (overrides: Partial<typeof baseComment> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CommentItem comment={{ ...baseComment, ...overrides }} questionId="q1" />
    </QueryClientProvider>,
  );

// Radix DropdownMenuTrigger opens on pointerdown (left button, no ctrl).
const openCommentMenu = () => {
  const trigger = document.querySelector('[aria-haspopup="menu"]');
  expect(trigger).not.toBeNull();
  fireEvent.pointerDown(trigger as Element, { button: 0, ctrlKey: false });
};

const openReportDialog = async () => {
  openCommentMenu();
  fireEvent.click(await screen.findByRole('menuitem', { name: /report/i }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.rpc.mockResolvedValue({ error: null });
});

describe('CommentItem — report flow goes through the flag_comment RPC', () => {
  it('submits exactly one rpc call with the chosen reason and trimmed details, no direct table writes', async () => {
    renderItem();
    await openReportDialog();

    fireEvent.click(screen.getByLabelText('Harassment'));
    fireEvent.change(screen.getByPlaceholderText('Additional details (optional)'), {
      target: { value: '  personal attack on the author  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(supabaseMock.rpc).toHaveBeenCalledTimes(1));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('flag_comment', {
      p_comment_id: 'c1',
      p_reason: 'Harassment',
      p_details: 'personal attack on the author',
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sends null details when the optional field is left empty and keeps the default reason', async () => {
    renderItem();
    await openReportDialog();

    fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(supabaseMock.rpc).toHaveBeenCalledTimes(1));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('flag_comment', {
      p_comment_id: 'c1',
      p_reason: 'Spam',
      p_details: null,
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('shows the error toast and keeps the dialog open when the rpc fails', async () => {
    supabaseMock.rpc.mockResolvedValue({ error: { message: 'Comment not found' } });
    renderItem();
    await openReportDialog();

    fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Comment not found'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('offers only a disabled "Already reported" item for a flagged comment', async () => {
    renderItem({ is_flagged: true });
    openCommentMenu();

    const item = await screen.findByRole('menuitem', { name: /already reported/i });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('menuitem', { name: /^report$/i })).not.toBeInTheDocument();
  });

  it('shows no report menu on the viewer’s own comment', () => {
    renderItem({ user_id: 'viewer-1' });
    expect(document.querySelector('[aria-haspopup="menu"]')).toBeNull();
  });
});
