// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import AdminSettingsPage from './AdminSettingsPage';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

const settingsResponse = {
  settings: {
    platform: { supportEmail: '', supportPhone: '', maintenanceMode: false },
    patient: { assessmentRequired: true, redFlagReviewRequired: true },
    finance: { currency: 'INR', directPatientDefaultFee: 0, paymentsEnabled: true, refundsEnabled: true, withdrawalsEnabled: true },
    notifications: { inAppEnabled: true, webPushEnabled: true, emailEnabled: true, smsEnabled: true, whatsappEnabled: true },
  },
  metadata: {},
};

const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminSettingsPage /></QueryClientProvider>);
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: settingsResponse } as never);
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { message: 'Settings updated' } } as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Finance direct-patient fee input', () => {
  it('allows replacing a zero value without a number spinner and saves the numeric amount', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /default fee for patients without a referring doctor/i }) as HTMLInputElement;

    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');
    expect(input.value).toBe('0');

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: '500' } });
    expect(input.value).toBe('500');

    fireEvent.click(screen.getAllByRole('button', { name: /save section/i })[2]);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(
      '/admin/settings/finance',
      expect.objectContaining({ directPatientDefaultFee: 500 }),
    ));
  });

  it('does not replace an empty amount with zero or submit an unintentional fee', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /default fee for patients without a referring doctor/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.click(screen.getAllByRole('button', { name: /save section/i })[2]);
    expect(input.value).toBe('');
    expect((await screen.findByRole('alert')).textContent).toMatch(/enter an amount/i);
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('rejects non-numeric characters and more than two decimal places', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /default fee for patients without a referring doctor/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '499.50' } });
    expect(input.value).toBe('499.50');
    fireEvent.change(input, { target: { value: '499.501' } });
    expect(input.value).toBe('499.50');
    fireEvent.change(input, { target: { value: '499e2' } });
    expect(input.value).toBe('499.50');
  });
});
