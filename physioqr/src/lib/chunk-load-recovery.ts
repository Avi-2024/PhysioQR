/**
 * Vite names lazy-route chunks with a content hash. A tab kept open across a
 * Vercel deployment can request a chunk that no longer exists.
 *
 * Retry via a full document reload once per page within a short time window.
 * Session storage survives reloads, preventing a bad connection or deployment
 * from causing an endless refresh loop.
 */
const RECOVERY_KEY = 'physioqr:stale-chunk-reload:v1';
const RELOAD_COOLDOWN_MS = 60_000;

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function isDynamicImportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script|loading chunk .* failed|chunkloaderror|unable to preload css/i.test(message);
}

export function shouldReloadForStaleChunk(
  storage: RecoveryStorage,
  page: string,
  now: number,
): boolean {
  const previous = storage.getItem(RECOVERY_KEY);
  if (previous) {
    try {
      const attempt = JSON.parse(previous) as { page?: unknown; at?: unknown };
      const time = Number(attempt.at);
      if (
        attempt.page === page &&
        Number.isFinite(time) &&
        now >= time &&
        now - time < RELOAD_COOLDOWN_MS
      ) return false;
    } catch {
      // Damaged storage must not stop the first valid recovery attempt.
    }
  }
  storage.setItem(RECOVERY_KEY, JSON.stringify({ page, at: now }));
  return true;
}

export function registerDynamicImportRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    // A reload while offline would only frustrate the user; let React Router's
    // error screen offer an explicit retry when connectivity returns.
    if (!navigator.onLine) return;
    try {
      const page = window.location.pathname + window.location.search;
      if (!shouldReloadForStaleChunk(window.sessionStorage, page, Date.now())) {
        // Do not prevent the error: route errorElement can render a recoverable
        // screen if even the fresh reload cannot load the requested module.
        return;
      }
      event.preventDefault();
      window.location.reload();
    } catch {
      // Browsers may block sessionStorage; never enter an unguarded reload loop.
    }
  });
}
