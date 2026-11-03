// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import AgentRegisterDoctorPage from './AgentRegisterDoctorPage';

vi.mock('@/lib/api-client', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Agent doctor registration without Rehab Program', () => {
  it('registers an agent doctor without selecting or fetching a rehab programme', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { _id: 'doctor-123', fullName: 'Dr Test', status: 'approved' },
    } as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgentRegisterDoctorPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByLabelText(/Rehab Program/i)).toBeNull();
    expect(screen.getByText(/profile and payment setup/i)).toBeTruthy();
    expect(apiClient.get).not.toHaveBeenCalled();

    const values = [
      ['Doctor Full Name', 'Dr Test'],
      ['Mobile Number', '9876543210'],
      ['Qualification', 'BPT'],
      ['Specialization', 'Orthopaedic Physio'],
      ['Medical Registration Number', 'TEST-123'],
      ['Clinic Name', 'Test Clinic'],
      ['City', 'Bhopal'],
      ['Patient Price (₹)', '1500'],
      ['Doctor Commission (%)', '60'],
    ] as const;
    for (const [name, value] of values) {
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Register Doctor' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/doctors');
    expect(body).toMatchObject({
      fullName: 'Dr Test',
      mobile: '9876543210',
      revenueModel: 'split',
      requestedPatientFee: 1500,
      requestedFeeShareType: 'percentage',
      requestedFeeSharePercentage: 60,
    });
    expect(body).not.toHaveProperty('preferredProgram');
    expect(apiClient.get).not.toHaveBeenCalled();

    expect(await screen.findByText('Doctor registered & approved')).toBeTruthy();
  });
});
