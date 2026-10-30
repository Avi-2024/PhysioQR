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
    // Legacy price stays in the backend state but must never appear in the Admin UI.
    finance: { currency: 'INR', directPatientDefaultFee: 850, websiteDirectRegistrationFee: 300, paymentsEnabled: true, refundsEnabled: true, withdrawalsEnabled: true },
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

describe('Admin Finance — website registration fee only', () => {
  it('shows only the ₹300 website fee and keeps the old direct-patient fee hidden', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /website-direct registration fee/i }) as HTMLInputElement;
    expect(input.value).toBe('300');
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');
    expect(screen.queryByRole('textbox', { name: /default fee for patients without a referring doctor/i })).toBeNull();
  });

  it('saves the Admin-edited website fee without sending or overwriting the legacy fee', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /website-direct registration fee/i }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '650' } });
    fireEvent.click(screen.getAllByRole('button', { name: /save section/i })[2]);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(
      '/admin/settings/finance',
      expect.objectContaining({ websiteDirectRegistrationFee: 650, paymentsEnabled: true, refundsEnabled: true, withdrawalsEnabled: true }),
    ));
    const [, payload] = vi.mocked(apiClient.patch).mock.calls.find(([url]) => url === '/admin/settings/finance')!;
    expect(payload).not.toHaveProperty('directPatientDefaultFee');
  });

  it('rejects zero/blank website fee without submitting Finance settings', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /website-direct registration fee/i }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getAllByRole('button', { name: /save section/i })[2]);
    expect((await screen.findByRole('alert')).textContent).toMatch(/website registration fee/i);
    expect(apiClient.patch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button', { name: /save section/i })[2]);
    expect(input.value).toBe('');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('refuses non-numeric characters and more than two decimal places', async () => {
    mount();
    const input = await screen.findByRole('textbox', { name: /website-direct registration fee/i }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '499.50' } });
    expect(input.value).toBe('499.50');
    fireEvent.change(input, { target: { value: '499.501' } });
    expect(input.value).toBe('499.50');
    fireEvent.change(input, { target: { value: '499e2' } });
    expect(input.value).toBe('499.50');
  });

  it('loads an existing website fee set by Admin instead of assuming ₹300', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { ...settingsResponse, settings: { ...settingsResponse.settings, finance: { ...settingsResponse.settings.finance, websiteDirectRegistrationFee: 725 } } },
    } as never);
    mount();
    const input = await screen.findByRole('textbox', { name: /website-direct registration fee/i }) as HTMLInputElement;
    expect(input.value).toBe('725');
  });
});
