'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('hrms_token');
  localStorage.removeItem('hrms_user');
}

function persistSession(token, user) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('hrms_token', token);
  }
  if (user) {
    localStorage.setItem('hrms_user', JSON.stringify(user));
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('hrms_user') : null;
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      const { data } = await authAPI.getMe();
      setUser(data.user);
      persistSession(null, data.user);
      return data.user;
    } catch {
      clearSession();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (identifier, password) => {
    const { data } = await authAPI.login(identifier, password);
    persistSession(data.token, data.user);
    setUser(data.user);
    if (data.user?.mustChangePassword) {
      window.location.href = '/change-password';
    }
    return data.user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Local cleanup should still happen even if the request fails.
    } finally {
      clearSession();
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    return loadUser();
  };

  const updateUser = (nextUser, token) => {
    setUser(nextUser);
    persistSession(token, nextUser);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    updateUser,
    isHR: user?.role === 'hr',
    isEmployee: user?.role === 'employee',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
