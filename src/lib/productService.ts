// Product service for API calls
import { apiUrl } from './apiConfig';

export class ProductService {
  static async createProduct(productData: {
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    price: number;
    cost: number;
    category: string;
    stock: number;
    minStock?: number;
    images?: string[];
  }) {
    try {
      const response = await fetch(apiUrl('api/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create product error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async getProducts(params?: {
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `${apiUrl('api/products')}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get products error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async updateProduct(id: string, productData: any) {
    try {
      const response = await fetch(apiUrl(`api/products/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update product error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async deleteProduct(id: string) {
    try {
      const response = await fetch(apiUrl(`api/products/${id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete product error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async adjustStock(id: string, adjustment: number, reason?: string) {
    try {
      const response = await fetch(apiUrl(`api/products/${id}/stock`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adjustment, reason }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Adjust stock error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
}
