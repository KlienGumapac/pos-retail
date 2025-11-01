import { apiUrl } from './apiConfig';

export interface TransactionItem {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

export interface ReturnedItem {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  returnAmount: number;
  description: string;
  returnedAt: string;
}

export interface Transaction {
  id: string;
  cashierId: string;
  items: TransactionItem[];
  returnedItems?: ReturnedItem[];
  subtotal: number;
  overallDiscount: number;
  totalAmount: number;
  cashReceived: number;
  change: number;
  status: 'completed' | 'refunded' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  cashierId: string;
  items: TransactionItem[];
  subtotal: number;
  overallDiscount: number;
  totalAmount: number;
  cashReceived: number;
  change: number;
}

export class TransactionService {
  static async createTransaction(transactionData: CreateTransactionRequest) {
    const response = await fetch(apiUrl('api/transactions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create transaction');
    }

    return result;
  }

  static async getTransactions(cashierId?: string, status?: string, limit?: number) {
    const params = new URLSearchParams();
    if (cashierId) params.append('cashierId', cashierId);
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${apiUrl('api/transactions')}?${params.toString()}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch transactions');
    }

    return result;
  }

  static async processReturn(transactionId: string, returnedItems: Array<{ itemIndex: number; quantity: number; description: string }>) {
    const response = await fetch(apiUrl(`api/transactions/${transactionId}/return`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ returnedItems }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to process return');
    }

    return result;
  }
}
