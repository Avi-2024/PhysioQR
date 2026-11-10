// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import DoctorQRReferralPage from './DoctorQRReferralPage';

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const mount = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DoctorQRReferralPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DoctorQRReferralPage', () => {
  it('shows fee setup card and gates QR standee when doctor has not set patient fee', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/doctors/me/profile') {
        return Promise.resolve({
          data: {
            _id: 'doc1',
            doctorId: 'DR0001',
            fullName: 'Dr. Sneha Sharma',
            clinicName: 'Spine Care Clinic',
            approvedPatientFee: 0,
            qrCodeActive: false,
          },
        }) as never;
      }
      if (url === '/doctors/me/qr-stats') {
        return Promise.resolve({
          data: {
            referralUrl: null,
            qrCodeUrl: null,
            totalScans: 0,
            totalRegistrations: 0,
            totalPaid: 0,
          },
        }) as never;
      }
      return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });

    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        message: 'Patient programme fee confirmed and QR code activated',
        approvedPatientFee: 1500,
        qrCodeActive: true,
      },
    } as never);

    mount();

    expect(await screen.findByText('Set Patient Programme Fee')).toBeTruthy();
    expect(screen.getByText(/Activate your clinic reception QR standee/i)).toBeTruthy();
    expect(screen.getByText(/Direct 50:50 Revenue Share/i)).toBeTruthy();

    const input = screen.getByLabelText(/Patient Programme Fee/i) as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: '2000' } });

    expect(screen.getAllByText('₹1,000').length).toBeGreaterThanOrEqual(1); // 50% split preview

    const submitBtn = screen.getByRole('button', { name: /Set Fee & Activate QR Standee/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/doctors/me/patient-fee', {
        approvedPatientFee: 2000,
      });
    });
  });

  it('renders referral poster and active fee banner when fee is confirmed and QR is active', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/doctors/me/profile') {
        return Promise.resolve({
          data: {
            _id: 'doc1',
            doctorId: 'DR0001',
            fullName: 'Dr. Sneha Sharma',
            clinicName: 'Spine Care Clinic',
            approvedPatientFee: 1500,
            qrCodeActive: true,
          },
        }) as never;
      }
      if (url === '/doctors/me/qr-stats') {
        return Promise.resolve({
          data: {
            referralUrl: 'http://localhost:3000/register?doctor=DR0001',
            qrCodeUrl: 'data:image/png;base64,mockqr',
            totalScans: 12,
            totalRegistrations: 5,
            totalPaid: 3,
          },
        }) as never;
      }
      return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });

    mount();

    expect(await screen.findByText(/Patient Programme Fee: ₹1,500/i)).toBeTruthy();
    expect(screen.getByText(/Start your recovery journey/i)).toBeTruthy();
    expect(screen.getByText('Dr. Sneha Sharma')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Update Fee/i })).toBeTruthy();
    expect(screen.getByText('http://localhost:3000/register?doctor=DR0001')).toBeTruthy();
  });
});
