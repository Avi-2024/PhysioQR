// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import AdminComplimentaryProgrammeCard from './AdminComplimentaryProgrammeCard';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const eligibility = {
  eligible: true,
  programmes: [{
    _id: '507f1f77bcf86cd799439011',
    name: 'Knee Rehabilitation',
    durationDays: 30,
    assessmentId: '507f1f77bcf86cd799439012',
  }],
};

const onAssigned = vi.fn(async () => {});
const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}>
    <AdminComplimentaryProgrammeCard patientId="PT00011" onAssigned={onAssigned} />
  </QueryClientProvider>);
};

const fillAndConfirm = async () => {
  const select = await screen.findByRole('combobox', { name: /select programme/i });
  fireEvent.change(select, { target: { value: eligibility.programmes[0]._id } });
  fireEvent.change(screen.getByRole('textbox', { name: /clinical assignment note/i }), {
    target: { value: 'Reviewed and approved for knee rehabilitation.' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: /free additional programme/i }));
  fireEvent.click(screen.getByRole('button', { name: /assign programme free/i }));
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: eligibility } as never);
  vi.mocked(apiClient.post).mockResolvedValue({ data: { amountCharged: 0 } } as never);
  onAssigned.mockClear();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Admin complimentary assignment toast', () => {
  it('shows a success toast only after backend confirms the free assignment', async () => {
    let resolvePost!: (value: unknown) => void;
    vi.mocked(apiClient.post).mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }) as never);
    mount();
    await fillAndConfirm();
    expect(screen.queryByRole('status')).toBeNull();

    resolvePost({ data: { amountCharged: 0 } });
    const toast = await screen.findByRole('status');
    expect(toast.textContent).toMatch(/programme assigned successfully/i);
    expect(toast.textContent).toMatch(/₹0/);
    await waitFor(() => expect(onAssigned).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/patients/PT00011/programmes/complimentary',
      expect.objectContaining({ confirmFree: true, programId: eligibility.programmes[0]._id }),
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows an error toast and never shows a success toast if assignment fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: { message: 'Clinical review still pending' } } });
    mount();
    await fillAndConfirm();
    const toast = await screen.findByRole('alert');
    expect(toast.textContent).toMatch(/programme could not be assigned/i);
    expect(toast.textContent).toMatch(/clinical review still pending/i);
    expect(screen.queryByRole('status')).toBeNull();
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('does not misreport successful assignment as failure if the refresh request fails', async () => {
    onAssigned.mockRejectedValueOnce(new Error('Refresh failed'));
    mount();
    await fillAndConfirm();
    const toast = await screen.findByRole('status');
    expect(toast.textContent).toMatch(/programme assigned successfully/i);
    expect(toast.textContent).toMatch(/₹0/);
  });
});
