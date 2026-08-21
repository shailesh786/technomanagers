import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CohortTestimonial } from '@/types';

/* The panel is admin-only behind an auth gate, so it cannot be exercised in a
   browser without signing in. These are smoke tests: the list renders, the
   editor swaps fields per kind, and the validation gate mirrors the table's
   payload CHECK so a save can never be rejected by the database for a reason
   the form did not already show. */

const rows: CohortTestimonial[] = [];
const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });

// Spies for the two mutations whose *arguments* are the thing under test.
const reorderSpy = vi.fn();
const updateSpy = vi.fn().mockResolvedValue(undefined);

const seedTwoRows = () => {
  rows.push(
    {
      id: 'a', kind: 'video', visible: true, display_order: 0, name: 'Varun Khanna',
      role: 'Product Lead', outcome: 'Offer at eGov', quote: '',
      video_url: 'https://youtu.be/dQw4w9WgXcQ', video_length: '2:14',
      image_url: null, created_at: null, updated_at: null,
    },
    {
      id: 'b', kind: 'text', visible: false, display_order: 10, name: 'Nischal S',
      role: 'PM', outcome: '', quote: 'Structured and useful.',
      video_url: null, video_length: '', image_url: null, created_at: null, updated_at: null,
    },
  );
};

vi.mock('@/hooks/useCohortTestimonials', () => ({
  useAllCohortTestimonials: () => ({ data: rows, isLoading: false }),
  useCreateCohortTestimonial: mutation,
  useUpdateCohortTestimonial: () => ({ mutate: updateSpy, mutateAsync: updateSpy, isPending: false }),
  useDeleteCohortTestimonial: mutation,
  useToggleCohortTestimonialVisible: mutation,
  useReorderCohortTestimonials: () => ({ mutate: reorderSpy, mutateAsync: reorderSpy, isPending: false }),
  useMoveCohortTestimonial: mutation,
}));

// Touches Supabase storage — irrelevant to what these tests cover.
vi.mock('@/components/admin/ImageUpload', () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
  uploadImageToBucket: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { default: AdminCohortTestimonials } = await import('@/components/admin/AdminCohortTestimonials');

const openEditor = () => {
  render(<AdminCohortTestimonials />);
  fireEvent.click(screen.getByRole('button', { name: /add the first one/i }));
};

describe('AdminCohortTestimonials', () => {
  beforeEach(() => {
    rows.length = 0;
    reorderSpy.mockClear();
    updateSpy.mockClear();
  });

  it('explains that the section stays hidden until something is published', () => {
    render(<AdminCohortTestimonials />);
    expect(screen.getByText('No testimonials yet')).toBeInTheDocument();
    expect(screen.getByText(/hidden on \/cohort until at least one is published/i)).toBeInTheDocument();
  });

  it('opens on the video kind and asks for a YouTube link', () => {
    openEditor();
    expect(screen.getByRole('heading', { name: 'Add testimonial' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/youtube\.com\/watch/i)).toBeInTheDocument();
  });

  it('blocks saving until the kind’s required payload is filled in', () => {
    openEditor();
    const save = screen.getByRole('button', { name: /add testimonial/i });

    expect(screen.getByText('Paste the YouTube link for this video.')).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: 'nonsense' },
    });
    expect(screen.getByText(/does not look like a YouTube link/i)).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
    });
    // Name is still missing, so the gate holds but the message moves on.
    expect(screen.getByText(/Add the reviewer/i)).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Varun Khanna'), { target: { value: 'Varun' } });
    expect(save).toBeEnabled();
  });

  it('confirms a parsed video id and previews the poster', () => {
    render(<AdminCohortTestimonials />);
    fireEvent.click(screen.getByRole('button', { name: /add the first one/i }));
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' },
    });
    expect(screen.getByText('dQw4w9WgXcQ')).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('warns, but still allows, a direct media URL — the pre-YouTube rows use them', () => {
    openEditor();
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: 'https://res.cloudinary.com/topmate/video/upload/v1/a.mp4' },
    });
    expect(screen.getByText(/Direct media file/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Varun Khanna'), { target: { value: 'Harshit' } });
    expect(screen.getByRole('button', { name: /add testimonial/i })).toBeEnabled();
  });

  it('swaps to a quote field for a written testimonial', () => {
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: /Written/ }));
    expect(screen.queryByPlaceholderText(/youtube\.com\/watch/i)).not.toBeInTheDocument();
    expect(screen.getByText('Quote *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add testimonial/i })).toBeDisabled();
  });

  it('swaps to an upload for a screenshot, and stops requiring a name', () => {
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: /Screenshot/ }));
    expect(screen.getByTestId('image-upload')).toBeInTheDocument();
    expect(screen.getByText('Screenshot *')).toBeInTheDocument();
    expect(screen.getByText('Upload the screenshot, or paste its URL.')).toBeInTheDocument();
    // Name is optional here — the capture carries its own attribution.
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('lists existing rows with their kind and live/hidden state', () => {
    seedTwoRows();
    render(<AdminCohortTestimonials />);

    expect(screen.getByText('1 of 2 live · 1 video')).toBeInTheDocument();
    expect(screen.getByText('Varun Khanna')).toBeInTheDocument();
    expect(screen.getByText('Offer at eGov')).toBeInTheDocument();
    expect(screen.getByText('Structured and useful.')).toBeInTheDocument();
  });

  it('disables the reorder controls that would run off the end of the list', () => {
    seedTwoRows();
    render(<AdminCohortTestimonials />);

    expect(screen.getByRole('button', { name: /Move Varun Khanna up/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Move Varun Khanna down/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Move Nischal S down/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Move Nischal S to the top/ })).toBeEnabled();
  });

  it('persists a move as a fully renumbered list, not a neighbour swap', () => {
    seedTwoRows();
    render(<AdminCohortTestimonials />);

    fireEvent.click(screen.getByRole('button', { name: /Move Nischal S to the top/ }));

    expect(reorderSpy).toHaveBeenCalledTimes(1);
    expect(reorderSpy.mock.calls[0][0].map((r: CohortTestimonial) => r.id)).toEqual(['b', 'a']);
  });

  it('keeps a hidden row hidden when it is edited', async () => {
    seedTwoRows();
    render(<AdminCohortTestimonials />);

    // Row "b" is the hidden one.
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    fireEvent.change(screen.getByPlaceholderText('Varun Khanna'), { target: { value: 'Nischal Shetty' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await vi.waitFor(() => expect(updateSpy).toHaveBeenCalled());
    expect(updateSpy.mock.calls[0][0]).toMatchObject({ id: 'b', visible: false });
  });
});
