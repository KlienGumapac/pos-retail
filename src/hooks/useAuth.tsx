"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@/types';
import { AuthService } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signup: (username: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const result = await AuthService.validateToken();
        if (result.success && result.user) {
          setUser(result.user);
          AuthService.setCurrentUser(result.user);
        } else {
          setUser(null);
          AuthService.setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await AuthService.login(username, password);
      if (result.success && result.user) {
        setUser(result.user);
        AuthService.setCurrentUser(result.user);
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    try {
      const result = await AuthService.signup(username, email, password, confirmPassword);
      if (result.success && result.user) {
        setUser(result.user);
        AuthService.setCurrentUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Signup failed' };
      }
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
      AuthService.setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}