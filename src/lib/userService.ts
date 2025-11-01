// User service for API calls
import { apiUrl } from './apiConfig';

export class UserService {
  static async createUser(userData: {
    username: string;
    email: string;
    user_type: string;
    password: string;
    confirmPassword: string;
  }) {
    try {
      const response = await fetch(apiUrl('api/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async getUsers() {
    try {
      const response = await fetch(apiUrl('api/users'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async updateUser(userData: {
    id: string;
    username: string;
    email: string;
    user_type: string;
    password?: string;
  }) {
    try {
      const response = await fetch(apiUrl('api/users'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
}
