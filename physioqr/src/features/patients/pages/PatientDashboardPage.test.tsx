// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import PatientDashboardPage from './PatientDashboardPage';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));
vi.mock('@/features/patients/pages/program/PatientProgrammePage', () => ({
  default: () => <div data-testid="exercise-panel">Session content</div>,
}));

const basePrescription = {
  enrollment: { id: 'enrollment-1', currentDay: 2, completionPercentage: 14 },
  program: { name: 'Neck Program 001', durationDays: 7 },
  day: { id: 'day-2', dayNumber: 2, title: 'Gentle neck mobility', exercises: [], videoAvailability: { ready: 0, total: 0 } },
};

const mount = (url = '/patient/dashboard') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}><PatientDashboardPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('patient home session readiness', () => {
  it('never advertises Start Day when the current day is empty', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: basePrescription } as never);
    mount();
    expect(await screen.findByRole('heading', { name: 'Neck Program 001' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start day/i })).toBeNull();
    expect(screen.getByRole('link', { name: /contact care team/i })).toBeTruthy();
    expect(screen.getByText(/exercises haven't been assigned/i)).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith('/patients/me/prescription', { params: {} });
  });

  it('renders Start Day only when the day has assigned exercises and approved videos', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      ...basePrescription,
      day: { ...basePrescription.day, exercises: [{ exercise: { name: 'Neck mobility' } }], videoAvailability: { ready: 1, total: 1 } },
    } } as never);
    mount('/patient/dashboard?enrollment=enrollment-1');
    expect(await screen.findByRole('button', { name: /start day 2/i })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: /programme completion/i }).getAttribute('aria-valuenow')).toBe('14');
    expect(apiClient.get).toHaveBeenCalledWith('/patients/me/prescription', { params: { enrollmentId: 'enrollment-1' } });
  });

  it('routes patients to written guidance instead of claiming unapproved video is ready', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      ...basePrescription,
      day: { ...basePrescription.day, exercises: [{ exercise: { name: 'Neck mobility' } }], videoAvailability: { ready: 0, total: 1, awaitingClinicalReview: 1 } },
    } } as never);
    mount();
    expect(await screen.findByRole('link', { name: /read exercise guidance/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start day/i })).toBeNull();
    expect(screen.getByText(/approved videos have not been linked/i)).toBeTruthy();
  });
});
