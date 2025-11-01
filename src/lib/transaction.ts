import mongoose, { Schema, Document } from 'mongoose';

interface ITransactionItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  price: number;
  discount: number; // percentage discount applied
  total: number; // final amount after discount
}

interface IReturnedItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  price: number;
  discount: number;
  total: number; // original item total
  returnAmount: number; // refunded amount
  description: string; // reason for return
  returnedAt: Date;
}

export interface ITransaction extends Document {
  cashierId: mongoose.Types.ObjectId;
  items: ITransactionItem[];
  returnedItems?: IReturnedItem[]; // items that have been returned
  subtotal: number;
  overallDiscount: number;
  totalAmount: number;
  cashReceived: number;
  change: number;
  status: 'completed' | 'refunded' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const TransactionItemSchema = new Schema<ITransactionItem>({
  productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0, max: 100 },
  total: { type: Number, required: true, min: 0 },
});

const ReturnedItemSchema = new Schema<IReturnedItem>({
  productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0, max: 100 },
  total: { type: Number, required: true, min: 0 },
  returnAmount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  returnedAt: { type: Date, default: Date.now }
});

const TransactionSchema = new Schema<ITransaction>({
  cashierId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  items: [TransactionItemSchema],
  returnedItems: { type: [ReturnedItemSchema], default: [] },
  subtotal: { type: Number, required: true, min: 0 },
  overallDiscount: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  cashReceived: { type: Number, required: true, min: 0 },
  change: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['completed', 'refunded', 'cancelled'], default: 'completed' },
}, {
  timestamps: true,
});

// Force model recreation to ensure schema changes are applied
if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
