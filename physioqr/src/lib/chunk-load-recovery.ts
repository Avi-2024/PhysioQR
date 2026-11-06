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

type RecoveryContext = {
  storage: RecoveryStorage;
  page: string;
  now: number;
  online: boolean;
  reload: () => void;
};

/** Testable, one-shot Vite preload-error handler. */
export function handleDynamicImportPreloadError(event: Event, context: RecoveryContext): void {
  // A reload while offline would only frustrate the user. Let the route error
  // boundary show a retry option once connectivity returns.
  if (!context.online) return;
  try {
    if (!shouldReloadForStaleChunk(context.storage, context.page, context.now)) {
      // Do not prevent the error: route errorElement can show a recovery screen
      // if even a freshly reloaded page cannot fetch the requested module.
      return;
    }
    event.preventDefault();
    context.reload();
  } catch {
    // sessionStorage may be blocked by browser privacy settings. Never enter
    // an unguarded reload loop.
  }
}

export function registerDynamicImportRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    handleDynamicImportPreloadError(event, {
      storage: window.sessionStorage,
      page: window.location.pathname + window.location.search,
      now: Date.now(),
      online: navigator.onLine,
      reload: () => window.location.reload(),
    });
  });
}
