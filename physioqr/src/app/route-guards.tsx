import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { getRedirectPathForRole } from '@/lib/permissions';
import type { UserRole, RevenueModel } from '@/types';

const PermissionDenied = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto px-4">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="text-gray-500">You do not have permission to view this page. Please contact your administrator if you believe this is an error.</p>
    </div>
  </div>
);

interface PublicRouteProps { children: ReactNode; }
export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (isAuthenticated && user) {
    if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
    return <Navigate to={getRedirectPathForRole(user.role)} replace />;
  }
  return <>{children}</>;
};

interface ProtectedRouteProps { children: ReactNode; }
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return <>{children}</>;
};

interface RoleProtectedRouteProps { allowedRoles: UserRole[]; children: ReactNode; }
export const RoleProtectedRoute = ({ allowedRoles, children }: RoleProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!allowedRoles.includes(user.role)) return <PermissionDenied />;
  return <>{children}</>;
};

interface RevenueModelProtectedRouteProps {
  allowedModels: RevenueModel[];
  children: ReactNode;
  fallbackPath?: string;
}

export const RevenueModelProtectedRoute = ({ allowedModels, children, fallbackPath }: RevenueModelProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  const revenueModel: RevenueModel | undefined = (user as AuthUserWithModel).revenueModel;
  if (!revenueModel || !allowedModels.includes(revenueModel)) {
    return <Navigate to={fallbackPath ?? getRedirectPathForRole(user.role)} replace />;
  }
  return <>{children}</>;
};

interface AuthUserWithModel { revenueModel?: RevenueModel; }
