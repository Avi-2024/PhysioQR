// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicRoute } from './route-guards';

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { role: 'patient', id: 'previous-patient', name: 'Previous Patient' },
  }),
}));
afterEach(() => cleanup());

describe('existing patient sign-in from registration', () => {
  it('opens login for an explicit account switch instead of the prior patient dashboard', () => {
    render(<MemoryRouter initialEntries={['/login?switch=1']}>
      <Routes>
        <Route path="/login" element={<PublicRoute><p>Patient OTP Sign In</p></PublicRoute>} />
        <Route path="/patient/dashboard" element={<p>Old Patient Dashboard</p>} />
      </Routes>
    </MemoryRouter>);
    expect(screen.getByText('Patient OTP Sign In')).toBeTruthy();
    expect(screen.queryByText('Old Patient Dashboard')).toBeNull();
  });
  it('preserves normal authenticated login redirection when no switch is requested', () => {
    render(<MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<PublicRoute><p>Patient OTP Sign In</p></PublicRoute>} />
        <Route path="/patient/dashboard" element={<p>Old Patient Dashboard</p>} />
      </Routes>
    </MemoryRouter>);
    expect(screen.getByText('Old Patient Dashboard')).toBeTruthy();
  });
});
