// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { HeroSection } from './HeroSection';
import { LandingHeader } from './LandingHeader';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Public homepage original look', () => {
  it('shows the original single recovery CTA without the extra adjacent register link or an API request', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onOpenPortal = vi.fn();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <HeroSection onOpenPortal={onOpenPortal} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const recovery = screen.getByRole('button', { name: /start your recovery/i });
    expect(recovery).toBeTruthy();
    expect(screen.queryByRole('link', { name: /new patient\? register directly/i })).toBeNull();
    fireEvent.click(recovery);
    expect(onOpenPortal).toHaveBeenCalledWith('patient');
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('keeps patient registration available from the original navigation header', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingHeader onOpenPortal={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /register as a patient/i }).getAttribute('href')).toBe('/register');
  });
});
