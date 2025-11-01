import { apiUrl } from './apiConfig';

export interface DistributionItem {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  price: number;
  totalValue: number;
}

export interface Distribution {
  id: string;
  adminId: string;
  cashierId: string;
  items: DistributionItem[];
  totalValue: number;
  status: 'pending' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributionRequest {
  adminId: string;
  cashierId: string;
  items: DistributionItem[];
  notes?: string;
}

export interface DistributionResponse {
  success: boolean;
  distribution?: Distribution;
  error?: string;
}

export interface DistributionsResponse {
  success: boolean;
  distributions?: Distribution[];
  error?: string;
}

export class DistributionService {
  private static getBaseUrl() {
    return apiUrl('api/distributions');
  }

  static async createDistribution(data: CreateDistributionRequest): Promise<DistributionResponse> {
    try {
      const response = await fetch(this.getBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating distribution:', error);
      return {
        success: false,
        error: 'Failed to create distribution'
      };
    }
  }

  static async getDistributions(cashierId?: string, status?: string): Promise<DistributionsResponse> {
    try {
      const params = new URLSearchParams();
      if (cashierId) params.append('cashierId', cashierId);
      if (status) params.append('status', status);

      const baseUrl = this.getBaseUrl();
      const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching distributions:', error);
      return {
        success: false,
        error: 'Failed to fetch distributions'
      };
    }
  }

  static async getCashierDistributions(cashierId: string): Promise<DistributionsResponse> {
    return this.getDistributions(cashierId);
  }
}
