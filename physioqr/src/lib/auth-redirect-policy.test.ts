import { describe, it, expect } from 'vitest';
import {
  isProtectedWorkspacePath,
  isPublicDisplayRequest,
  shouldHandleUnauthorizedSession,
} from './auth-redirect-policy';

describe('Public site must not automatically redirect to login on API errors', () => {
  it.each(['/', '/home', '/register', '/login', '/patients', '/doctors', '/qr', '/payment-success', '/payment-failed'])(
    'a 401 on public page %s cannot force login',
    (pathname) => {
      expect(isProtectedWorkspacePath(pathname)).toBe(false);
      expect(shouldHandleUnauthorizedSession(401, '/settings/direct-registration-fee', pathname)).toBe(false);
      expect(shouldHandleUnauthorizedSession(401, '/some-other-api', pathname)).toBe(false);
    },
  );

  it.each(['/admin', '/admin/dashboard', '/agent/dashboard', '/doctor/dashboard', '/patient/continue-payment'])(
    'a protected workspace still signs out on an unauthorized private API request: %s',
    (pathname) => {
      expect(isProtectedWorkspacePath(pathname)).toBe(true);
      expect(shouldHandleUnauthorizedSession(401, '/doctors/me/profile', pathname)).toBe(true);
      expect(shouldHandleUnauthorizedSession(403, '/doctors/me/profile', pathname)).toBe(false);
    },
  );

  it('a public fee-display endpoint never logs out any page even if the backend returns 401', () => {
    expect(isPublicDisplayRequest('/settings/direct-registration-fee')).toBe(true);
    expect(isPublicDisplayRequest('https://api.example.com/api/settings/direct-registration-fee?test=1')).toBe(true);
    expect(isPublicDisplayRequest('/payments/orders')).toBe(false);
    expect(shouldHandleUnauthorizedSession(401, '/settings/direct-registration-fee', '/doctor/dashboard')).toBe(false);
  });

  it('the public /doctors marketing page is not mistaken for /doctor dashboard', () => {
    expect(isProtectedWorkspacePath('/doctors')).toBe(false);
    expect(isProtectedWorkspacePath('/patients')).toBe(false);
    expect(isProtectedWorkspacePath('/doctor/dashboard')).toBe(true);
  });
});
