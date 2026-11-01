// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { HeroSection } from './HeroSection';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Public homepage', () => {
  it('renders the direct signup link without fetching a protected or version-dependent API', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <HeroSection onOpenPortal={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const register = screen.getByRole('link', { name: /new patient\? register directly/i });
    expect(register.getAttribute('href')).toBe('/register');
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
