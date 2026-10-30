// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import DoctorRecoveryOverviewPanel from './DoctorRecoveryOverviewPanel';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn() } }));

const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><DoctorRecoveryOverviewPanel /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: {
    periodDays: 30, totalReferredPatients: 1, patientsReporting: 1,
    loggedDays: 4, completedDays: 3, discomfortDays: 1,
    recentUpdates: [{
      patientId: 'PT00011', patientName: 'Patient Test', programmeName: 'Neck Rehabilitation',
      dayNumber: 4, completed: true, painBefore: 3, painAfter: 5,
      discomfortReported: true, needsReview: true,
      feedback: 'Stiffness increased', updatedAt: '2026-10-29T09:00:00Z',
    }],
  } } as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Doctor dashboard referred patient recovery monitoring', () => {
  it('shows patient-reported updates with a deep link to their progress page', async () => {
    mount();
    const region = await screen.findByRole('region', { name: 'Referred patient recovery updates' });
    expect(within(region).getByText('Recovery updates')).toBeTruthy();
    expect(within(region).getByText('Patient Test')).toBeTruthy();
    expect(within(region).getByText(/discomfort reported/i)).toBeTruthy();
    expect(within(region).getByText(/stiffness increased/i)).toBeTruthy();
    expect(within(region).getByText(/pain before/i)).toBeTruthy();
    expect(within(region).getByText(/pain after/i)).toBeTruthy();
    expect(within(region).getByRole('link', { name: /review detailed progress/i }).getAttribute('href'))
      .toBe('/doctor/patients/PT00011/progress');
    expect(apiClient.get).toHaveBeenCalledWith('/doctors/me/recovery-overview');
  });

  it('shows a safe empty state when no referred patients reported activity', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: {
      periodDays: 30, totalReferredPatients: 0, patientsReporting: 0,
      loggedDays: 0, completedDays: 0, discomfortDays: 0, recentUpdates: [],
    } } as never);
    mount();
    expect(await screen.findByText('No recent rehabilitation activity')).toBeTruthy();
    expect(screen.getByRole('link', { name: /all referred patients/i })).toBeTruthy();
  });

  it('leaves the doctor dashboard usable if recovery API is temporarily unavailable', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Server unavailable'));
    mount();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('link', { name: /all referred patients/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /retry updates/i })).toBeTruthy();
  });
});
