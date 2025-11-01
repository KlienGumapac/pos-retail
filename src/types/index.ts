// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  INVENTORY = 'inventory'
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Transaction Types
export interface Transaction {
  id: string;
  transactionNumber: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashierId: string;
  customerId?: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE = 'mobile',
  CHECK = 'check'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Customer Types
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: Address;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Inventory Types
export interface InventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  userId: string;
  createdAt: Date;
}

export enum InventoryMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Types
export interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface ProductForm {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  minStock: number;
  images?: string[];
}
