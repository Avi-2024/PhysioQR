import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { getRedirectPathForRole } from '@/lib/permissions';
import type { UserRole, RevenueModel } from '@/types';

// ---------------------------------------------------------------------------
// PermissionDenied page (inline — no external dep needed)
// ---------------------------------------------------------------------------

const PermissionDenied = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto px-4">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-10 w-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="text-gray-500">
        You do not have permission to view this page. Please contact your
        administrator if you believe this is an error.
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// PublicRoute — redirect authenticated users to their role home
// ---------------------------------------------------------------------------

interface PublicRouteProps {
  children: ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (isAuthenticated && user) {
    const redirectPath = getRedirectPathForRole(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// ProtectedRoute — redirect unauthenticated users to /login
// ---------------------------------------------------------------------------

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// RoleProtectedRoute — shows PermissionDenied if role not allowed
// ---------------------------------------------------------------------------

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export const RoleProtectedRoute = ({
  allowedRoles,
  children,
}: RoleProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <PermissionDenied />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// RevenueModelProtectedRoute — for doctor-only wallet / split-model routes
// ---------------------------------------------------------------------------

interface RevenueModelProtectedRouteProps {
  allowedModels: RevenueModel[];
  children: ReactNode;
  /** Fallback path to redirect to when model is not allowed.
   *  Defaults to the user's role home dashboard. */
  fallbackPath?: string;
}

/**
 * This guard is used on top of an already-authenticated doctor route.
 * It reads `revenueModel` from the authenticated user's extended profile.
 * Since `AuthUser` does not carry `revenueModel` directly, the guard expects
 * the caller to pass it in via context or checks it via a prop extension.
 *
 * For now, the guard works by checking `(user as any).revenueModel`. The
 * doctor profile query should `setUser` with the enriched user object after
 * login so that this field is available.
 */
export const RevenueModelProtectedRoute = ({
  allowedModels,
  children,
  fallbackPath,
}: RevenueModelProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const revenueModel: RevenueModel | undefined = (user as AuthUserWithModel)
    .revenueModel;

  if (!revenueModel || !allowedModels.includes(revenueModel)) {
    const redirect =
      fallbackPath ?? getRedirectPathForRole(user.role);
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// Type augmentation helper (private to this module)
// ---------------------------------------------------------------------------

interface AuthUserWithModel {
  revenueModel?: RevenueModel;
}
