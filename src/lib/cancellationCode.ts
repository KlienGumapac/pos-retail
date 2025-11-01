import mongoose, { Document, Schema } from 'mongoose';

export interface ICancellationCode extends Document {
  code: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CancellationCodeSchema = new Schema<ICancellationCode>({
  code: {
    type: String,
    required: [true, 'Cancellation code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [3, 'Code must be at least 3 characters long'],
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: [true, 'Created by field is required'],
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
CancellationCodeSchema.index({ code: 1 });
CancellationCodeSchema.index({ isActive: 1 });
CancellationCodeSchema.index({ createdBy: 1 });

export default mongoose.models.CancellationCode || mongoose.model<ICancellationCode>('CancellationCode', CancellationCodeSchema);
