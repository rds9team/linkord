import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ProfileData } from '../types';
import { fetchMe, devLogin as apiDevLogin, logout as apiLogout, loginWithPassword as apiLoginWithPassword, registerAccount as apiRegisterAccount } from '../api/client';

interface AuthContextType {
  user: ProfileData | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async () => {
    try {
      await apiDevLogin();
      await refreshUser();
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const loginWithPassword = async (identifier: string, password: string) => {
    try {
      await apiLoginWithPassword({ identifier, password });
      await refreshUser();
    } catch (err) {
      console.error('Password login failed:', err);
      throw err;
    }
  };

  const register = async (username: string, password: string, displayName?: string) => {
    try {
      await apiRegisterAccount({ username, password, display_name: displayName });
      await refreshUser();
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        loginWithPassword,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
