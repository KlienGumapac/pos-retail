import { User, UserRole } from '@/types';
import { apiUrl } from './apiConfig';

// Authentication service that connects to the database
export class AuthService {
  private static currentUser: User | null = null;

  static async validateToken(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (typeof window === 'undefined') {
        return { success: false, error: 'Not in browser environment' };
      }

      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(apiUrl('api/auth/validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        const user: User = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.user_type as UserRole,
          isActive: data.user.isActive,
          createdAt: new Date(data.user.createdAt),
          updatedAt: new Date()
        };

        this.currentUser = user;
        return { success: true, user };
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('token');
      return { success: false, error: 'Token validation failed' };
    }
  }

  static async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(apiUrl('api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
        }
        
        // Convert database user to our User type
        const user: User = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.user_type as UserRole,
          isActive: data.user.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.currentUser = user;
        return { success: true, user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async signup(username: string, email: string, password: string, confirmPassword: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(apiUrl('api/auth/signup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
        }
        
        // Convert database user to our User type
        const user: User = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.user_type as UserRole,
          isActive: data.user.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.currentUser = user;
        return { success: true, user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async logout(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  static setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  static isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  static hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role;
  }

  static hasAnyRole(roles: UserRole[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }
}
