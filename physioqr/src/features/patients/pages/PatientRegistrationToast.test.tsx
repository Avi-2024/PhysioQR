// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import PatientRegistrationPageV3, { patientRegistrationErrorMessage } from './PatientRegistrationPageV3';

vi.mock('@/lib/api-client', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ login: vi.fn(), logout: vi.fn() }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/register']}><PatientRegistrationPageV3 /></MemoryRouter></QueryClientProvider>);
};

const fillDetails = async () => {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Patient Example' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'example@example.com' } });
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '35' } });
  fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'male' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue to mobile verification/i }));
  await screen.findByText('Verify your mobile number');
};

describe('patient registration notifications', () => {
  it('shows basic registration validation in an accessible dismissible toast instead of a red inline banner', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Continue to mobile verification/i }));
    const toast = await screen.findByTestId('patient-registration-toast');
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.textContent).toContain('Enter your full name');
    expect(screen.getByText('Tell us about yourself')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss registration notification' }));
    await waitFor(() => expect(screen.queryByTestId('patient-registration-toast')).toBeNull());
  });

  it('reports OTP service errors as toast; editing the mobile clears the stale notification', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { status: 503, data: { message: 'OTP service is temporarily unavailable. Please try again.' } },
    });
    mount();
    await fillDetails();
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    const toast = await screen.findByTestId('patient-registration-toast');
    expect(toast.textContent).toContain('OTP service is temporarily unavailable');
    expect(screen.queryByText('Mobile number verified successfully.')).toBeNull();
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543211' } });
    await waitFor(() => expect(screen.queryByTestId('patient-registration-toast')).toBeNull());
  });

  it('converts unavailable assessment configuration into a toast without bypassing consent or registration verification', async () => {
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (url === '/auth/send-otp') return { data: { message: 'OTP sent' } };
      if (url === '/patients/register') return { data: { patient: { id: 'patient-id', fullName: 'Patient Example' } } };
      if (url === '/auth/verify-otp') return { data: {
        registered: true,
        accessToken: 'test-token',
        patient: { id: 'patient-id', fullName: 'Patient Example', mobile: '9876543210' },
      } };
      if (url === '/patients/consent') return { data: { saved: true } };
      throw Error('Unexpected endpoint ' + url);
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { caseTypes: [], bodyRegions: [] } } as never);
    mount();
    await fillDetails();
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    await screen.findByLabelText('Enter OTP');
    fireEvent.change(screen.getByLabelText('Enter OTP'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
    await screen.findByText('Mobile number verified successfully.');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Consent & medical disclaimer');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Accept & Continue/i }));
    await screen.findByText('Health assessment');
    const toast = await screen.findByTestId('patient-registration-toast');
    expect(toast.textContent).toContain('No active assessment pathways are available');
    expect(screen.queryByText('No active case types are configured.')).toBeNull();
  });

  it('turns a private-storage configuration error into actionable patient-friendly wording', () => {
    expect(patientRegistrationErrorMessage(
      'Private document storage is not configured. You can continue the assessment without attachments.',
    )).toBe('Document uploads are temporarily unavailable. You can continue the assessment without attachments.');
  });
});
