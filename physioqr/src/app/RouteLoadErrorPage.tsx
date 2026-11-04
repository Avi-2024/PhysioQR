import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { isDynamicImportFailure } from '@/lib/chunk-load-recovery';
import { useRouteError } from 'react-router-dom';

/**
 * Catch errors raised while loading/rendering lazy dashboard routes. An old
 * module hash should never turn into React Router's raw exception screen.
 * Keep the current path intact so a refresh returns to the same dashboard.
 */
export default function RouteLoadErrorPage() {
  const error = useRouteError();
  const staleModule = isDynamicImportFailure(error);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          {offline ? <WifiOff className="h-7 w-7" aria-hidden="true" /> : <AlertTriangle className="h-7 w-7" aria-hidden="true" />}
        </div>
        <h1 className="mt-5 text-xl font-bold text-neutral-950">
          {offline ? 'Your internet connection is unavailable' : staleModule ? 'PhysioQR has a new version' : 'This page could not be loaded'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {offline
            ? 'Reconnect to the internet and try loading this page again.'
            : staleModule
              ? 'The dashboard was updated while your browser had an older version open. Reload to open the latest version.'
              : 'There was a temporary problem loading this page. Your saved account and programme data are not changed by reloading.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reload page
        </button>
        <a href="/" className="mt-4 inline-block text-sm font-medium text-emerald-700 underline">
          Go to PhysioQR homepage
        </a>
      </section>
    </main>
  );
}
