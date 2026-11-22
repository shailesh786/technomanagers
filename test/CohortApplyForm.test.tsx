import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CohortApplyForm from '@/components/cohort/CohortApplyForm';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

// Radix radio/checkbox measure themselves; jsdom has no ResizeObserver.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Asha Rao' } });
  fireEvent.change(screen.getByLabelText(/^Email address/), { target: { value: 'asha@example.com' } });
  fireEvent.change(screen.getByLabelText(/^Phone \/ WhatsApp/), { target: { value: '9876543210' } });
  fireEvent.click(screen.getByLabelText('Product Manager'));
  fireEvent.click(screen.getByLabelText('3 to 5 years'));
  fireEvent.click(screen.getByLabelText('Build and ship real AI products'));
}

describe('CohortApplyForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with every consent unticked', () => {
    render(<CohortApplyForm />);
    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked();
  });

  it('has the same fields as the Topmate form, with one consent checkbox', () => {
    render(<CohortApplyForm />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.queryByLabelText(/LinkedIn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/how do you plan to pay/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toHaveValue('IN');
  });

  it('blocks submission until the consent is ticked', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<CohortApplyForm />);
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    expect(await screen.findAllByText('Please tick this to continue')).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits once everything is ticked and shows the confirmation', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, id: 'x', emailSent: true }), { status: 200 }),
    );
    render(<CohortApplyForm />);
    fillRequired();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByText('Application received')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.consents).toEqual({ agreement: true });
    expect(body.country).toBe('IN');
    expect(body.phone).toBe('9876543210');
  });
});

describe('CohortApplyForm consent links', () => {
  it('links the cohort page, refund policy and privacy policy', () => {
    render(<CohortApplyForm />);
    expect(screen.getByRole('link', { name: 'technomanagers.in/cohort' })).toHaveAttribute('href', '/cohort');
    expect(screen.getByRole('link', { name: 'refund policy' })).toHaveAttribute('href', '/refund-policy');
    expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy');
  });
});
