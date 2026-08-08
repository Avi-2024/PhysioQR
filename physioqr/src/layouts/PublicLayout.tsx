import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export function PublicLayout() {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
      <main className="flex-1">
        <Outlet />
      </main>
      {!isLanding && (
        <footer className="py-4 text-center text-xs text-neutral-400 border-t border-neutral-200">
          © 2026 PhysioQR. All rights reserved. Professional Rehabilitation Platform.
        </footer>
      )}
    </div>
  );
}
