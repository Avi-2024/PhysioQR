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

describe('Agent doctor registration', () => {
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
      ['Email Address', 'drtest@example.com'],
      ['Qualification', 'BPT'],
      ['Specialization', 'Orthopaedic Physio'],
      ['Medical Registration Number', 'TEST-123'],
      ['Clinic Name', 'Test Clinic'],
      ['City', 'Bhopal'],
      ['Patient Price (₹)', '1500'],
      ['Doctor Commission (%)', '60'],
    ] as const;
    for (const [name, value] of values) {
      fireEvent.change(screen.getByLabelText(name, { exact: false }), { target: { value } });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Register Doctor' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/doctors');
    expect(body).toMatchObject({
      fullName: 'Dr Test',
      mobile: '9876543210',
      email: 'drtest@example.com',
      revenueModel: 'split',
      requestedPatientFee: 1500,
      requestedFeeShareType: 'percentage',
      requestedFeeSharePercentage: 60,
    });
    expect(body).not.toHaveProperty('preferredProgram');
    expect(apiClient.get).not.toHaveBeenCalled();

    expect(await screen.findByText('Doctor registered & approved')).toBeTruthy();
  });

  it('populates cities when state is selected, supports clinic address, and submits all fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        _id: 'doctor-456',
        doctorId: 'DOC-456',
        fullName: 'Dr. Priya Sharma',
        mobile: '9820012345',
        email: 'priya@clinic.com',
        clinicName: 'Spine & Joint Center',
        state: 'Maharashtra',
        city: 'Mumbai',
        status: 'approved',
        temporaryPassword: 'TempPassword123!',
      },
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

    fireEvent.change(screen.getByLabelText('Doctor Full Name', { exact: false }), { target: { value: 'Dr. Priya Sharma' } });
    fireEvent.change(screen.getByLabelText('Mobile Number', { exact: false }), { target: { value: '9820012345' } });
    fireEvent.change(screen.getByLabelText('Email Address', { exact: false }), { target: { value: 'priya@clinic.com' } });
    fireEvent.change(screen.getByLabelText('Qualification', { exact: false }), { target: { value: 'MPT Ortho' } });
    fireEvent.change(screen.getByLabelText('Specialization', { exact: false }), { target: { value: 'Sports Physiotherapy' } });
    fireEvent.change(screen.getByLabelText('Medical Registration Number', { exact: false }), { target: { value: 'MH-2021-987' } });
    fireEvent.change(screen.getByLabelText('Clinic Name', { exact: false }), { target: { value: 'Spine & Joint Center' } });

    // Select Maharashtra State
    fireEvent.change(screen.getByLabelText('State', { exact: false }), { target: { value: 'Maharashtra' } });

    // City should now be populated as a select with Maharashtra cities
    const citySelect = screen.getByLabelText('City', { exact: false });
    expect(citySelect.tagName.toLowerCase()).toBe('select');
    fireEvent.change(citySelect, { target: { value: 'Mumbai' } });

    // Clinic Address textarea
    fireEvent.change(screen.getByLabelText('Clinic Address', { exact: false }), {
      target: { value: 'Suite 402, Metro Complex, Dadar West' },
    });

    fireEvent.change(screen.getByLabelText('Patient Price (₹)', { exact: false }), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('Doctor Commission (%)', { exact: false }), { target: { value: '55' } });

    fireEvent.click(screen.getByRole('button', { name: 'Register Doctor' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe('/doctors');
    expect(body).toMatchObject({
      fullName: 'Dr. Priya Sharma',
      mobile: '9820012345',
      email: 'priya@clinic.com',
      qualification: 'MPT Ortho',
      specialization: 'Sports Physiotherapy',
      medicalRegNumber: 'MH-2021-987',
      clinicName: 'Spine & Joint Center',
      state: 'Maharashtra',
      city: 'Mumbai',
      clinicAddress: 'Suite 402, Metro Complex, Dadar West',
      revenueModel: 'split',
      requestedPatientFee: 2000,
      requestedFeeShareType: 'percentage',
      requestedFeeSharePercentage: 55,
    });

    expect(await screen.findByText('Doctor registered & approved')).toBeTruthy();
    expect(screen.getByText('TempPassword123!')).toBeTruthy();
  });
});
