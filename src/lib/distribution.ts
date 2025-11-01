import mongoose, { Schema, Document } from 'mongoose';

export interface IDistribution extends Document {
  id: string;
  adminId: string;
  cashierId: string;
  items: {
    productId: string;
    productName: string;
    productSku: string;
    category: string;
    quantity: number;
    price: number;
    totalValue: number;
  }[];
  totalValue: number;
  status: 'pending' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DistributionItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  totalValue: { type: Number, required: true, min: 0 }
}, { _id: false });

const DistributionSchema = new Schema({
  adminId: { type: String, required: true },
  cashierId: { type: String, required: true },
  items: [DistributionItemSchema],
  totalValue: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  notes: { type: String }
}, {
  timestamps: true
});

// Add virtual id field
DistributionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
DistributionSchema.set('toJSON', {
  virtuals: true
});

DistributionSchema.set('toObject', {
  virtuals: true
});

// Force model recreation to ensure schema changes are applied
if (mongoose.models.Distribution) {
  delete mongoose.models.Distribution;
}

export const Distribution = mongoose.model<IDistribution>('Distribution', DistributionSchema);
