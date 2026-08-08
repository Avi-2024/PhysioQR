import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { clearTokens, getAccessToken, setAccessToken } from '@/lib/auth-storage';
import { queryClient } from '@/app/query-client';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem('rc_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = (userData: AuthUser, token: string) => {
    setAccessToken(token);
    sessionStorage.setItem('rc_user', JSON.stringify(userData));
    setUserState(userData);
  };

  const logout = () => {
    clearTokens();
    sessionStorage.removeItem('rc_user');
    queryClient.clear();
    setUserState(null);
  };

  const setUser = (userData: AuthUser | null) => {
    if (userData) {
      sessionStorage.setItem('rc_user', JSON.stringify(userData));
    } else {
      sessionStorage.removeItem('rc_user');
    }
    setUserState(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthStore = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider');
  }
  return context;
};
