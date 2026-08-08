import type { UserRole } from './common.types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

export interface OtpVerifyPayload {
  mobile: string;
  otp: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'mobile_change';
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
