import { describe, expect, it, vi } from 'vitest';
import {
  handleDynamicImportPreloadError,
  isDynamicImportFailure,
  shouldReloadForStaleChunk,
} from './chunk-load-recovery';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe('recovery from stale Vite dashboard chunks', () => {
  it('detects known lazy module-loading errors without mistaking ordinary API failures', () => {
    expect(isDynamicImportFailure(new TypeError(
      'Failed to fetch dynamically imported module: https://physio-qr-teal.vercel.app/assets/AgentDashboardPage-OLDHASH.js',
    ))).toBe(true);
    expect(isDynamicImportFailure(new Error('Importing a module script failed.'))).toBe(true);
    expect(isDynamicImportFailure(new Error('Loading chunk 123 failed'))).toBe(true);
    expect(isDynamicImportFailure(new Error('Doctor visit API returned 500'))).toBe(false);
    expect(isDynamicImportFailure(undefined)).toBe(false);
  });

  it('reloads the current agent route once and suppresses the first preload error', () => {
    const storage = fakeStorage();
    const reload = vi.fn();
    const makeEvent = () => new Event('vite:preloadError', { cancelable: true });
    const first = makeEvent();
    handleDynamicImportPreloadError(first, {
      storage, page: '/agent/dashboard', now: 1000, online: true, reload,
    });
    expect(first.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    // Browser returned to a still-broken deployment: no infinite reload loop.
    const second = makeEvent();
    handleDynamicImportPreloadError(second, {
      storage, page: '/agent/dashboard', now: 2000, online: true, reload,
    });
    expect(second.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not auto-reload offline and permits recovery on a later deployment', () => {
    const storage = fakeStorage();
    const reload = vi.fn();
    const offline = new Event('vite:preloadError', { cancelable: true });
    handleDynamicImportPreloadError(offline, {
      storage, page: '/agent/dashboard', now: 1000, online: false, reload,
    });
    expect(offline.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(shouldReloadForStaleChunk(storage, '/agent/dashboard', 1001)).toBe(true);
    expect(shouldReloadForStaleChunk(storage, '/agent/dashboard', 2000)).toBe(false);
    expect(shouldReloadForStaleChunk(storage, '/agent/dashboard', 61_002)).toBe(true);
  });

  it('does not trigger a reload loop if browser session storage is blocked', () => {
    const reload = vi.fn();
    const storage = { getItem: () => { throw new Error('Storage blocked'); }, setItem: vi.fn() };
    const event = new Event('vite:preloadError', { cancelable: true });
    handleDynamicImportPreloadError(event, {
      storage, page: '/agent/dashboard', now: 1000, online: true, reload,
    });
    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('retains the same path and query string when deciding stale-chunk recovery', () => {
    const storage = fakeStorage();
    expect(shouldReloadForStaleChunk(storage, '/doctor/dashboard?view=patients', 1000)).toBe(true);
    expect(shouldReloadForStaleChunk(storage, '/doctor/dashboard?view=patients', 1001)).toBe(false);
    expect(shouldReloadForStaleChunk(storage, '/doctor/dashboard?view=progress', 1002)).toBe(true);
  });
});
