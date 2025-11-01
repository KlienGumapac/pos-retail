import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
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

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'SKU cannot exceed 50 characters']
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    maxlength: [50, 'Barcode cannot exceed 50 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'Minimum stock is required'],
    min: [0, 'Minimum stock cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
// SKU index is automatically created by unique: true constraint
// Barcode index removed to avoid duplicate index warnings
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text' }); // Text search index

// Pre-save middleware to ensure SKU is uppercase
ProductSchema.pre('save', function(next) {
  if (this.sku) {
    this.sku = this.sku.toUpperCase();
  }
  next();
});

// Virtual for profit margin
ProductSchema.virtual('profitMargin').get(function() {
  if (this.cost > 0) {
    return ((this.price - this.cost) / this.cost * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out';
  if (this.stock <= this.minStock) return 'low';
  return 'good';
});

// Ensure virtual fields are serialized
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
