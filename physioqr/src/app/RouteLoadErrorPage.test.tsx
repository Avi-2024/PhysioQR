// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import RouteLoadErrorPage from './RouteLoadErrorPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderFailingRoute(message: string) {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function FailedLazyRoute(): React.ReactElement {
    throw new TypeError(message);
  }
  const router = createMemoryRouter([{
    path: '/agent/dashboard',
    element: <FailedLazyRoute />,
    errorElement: <RouteLoadErrorPage />,
  }], { initialEntries: ['/agent/dashboard'] });
  render(<RouterProvider router={router} />);
}

describe('safe React Router dashboard recovery', () => {
  it('shows a friendly recovery screen for a stale Agent Dashboard chunk', () => {
    renderFailingRoute('Failed to fetch dynamically imported module: /assets/AgentDashboardPage-old.js');
    expect(screen.getByText('PhysioQR has a new version')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to PhysioQR homepage' }).getAttribute('href')).toBe('/');
    expect(screen.queryByText('Unexpected Application Error!')).toBeNull();
  });

  it('does not expose a raw technical exception on unrelated route failures', () => {
    renderFailingRoute('Private internal stack trace');
    expect(screen.getByText('This page could not be loaded')).toBeTruthy();
    expect(screen.queryByText('Private internal stack trace')).toBeNull();
  });
});
