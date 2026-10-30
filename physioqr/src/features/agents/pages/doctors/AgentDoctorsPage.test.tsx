// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import AgentDoctorsPage from './AgentDoctorsPage';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><AgentDoctorsPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: [
    { _id: '507f1f77bcf86cd799439012', doctorId: 'DR001', fullName: 'Dr Alpha',
      clinicName: 'Alpha Clinic', status: 'approved', clinicVisits: 9, connectedPatients: 4 },
    { _id: '507f1f77bcf86cd799439013', doctorId: 'DR002', fullName: 'Dr Beta',
      clinicName: 'Beta Clinic', status: 'approved', clinicVisits: 0, connectedPatients: 0 },
  ] } as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Agent doctor-wise operational metrics', () => {
  it('shows each doctors visit total and linked patients, including zero values', async () => {
    mount();
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('columnheader', { name: /clinic visits/i })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: /referred patients/i })).toBeTruthy();
    expect(within(table).getByText('Dr Alpha')).toBeTruthy();
    expect(within(table).getByText('9')).toBeTruthy();
    expect(within(table).getByText('4')).toBeTruthy();
    expect(within(table).getByText('Dr Beta')).toBeTruthy();
    expect(within(table).getAllByText('0').length).toBe(2);
    expect(apiClient.get).toHaveBeenCalledWith('/agents/me/doctors');
  });

  it('does not render revenue, earnings or commission columns', async () => {
    mount();
    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((item) => item.textContent?.toLowerCase() || '').join(' ');
    expect(headers).not.toMatch(/revenue|earning|commission|payout|price|payment/);
  });
});
