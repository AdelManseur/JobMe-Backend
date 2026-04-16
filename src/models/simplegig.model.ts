import mongoose, { Document, Schema } from "mongoose";

export interface ISimpleGig extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  deliveryTime: number; // in days
  revisions: number;
  features: string[];
  images: string[]; // Array of image URLs
  questions: string[]; // For buyer specifications or FAQs
  seller: mongoose.Types.ObjectId; // Reference to User
  rating: {
    average: number;
    count: number;
  };
  totalOrders: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const simpleGigSchema = new Schema<ISimpleGig>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  description: {
    type: String,
    required: true,
    maxlength: 1200
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Graphics & Design',
      'Digital Marketing',
      'Writing & Translation',
      'Video & Animation',
      'Music & Audio',
      'Programming & Tech',
      'Data',
      'Business',
      'Lifestyle'
    ]
  },
  tags: [{
    type: String,
    maxlength: 20
  }],
  price: {
    type: Number,
    required: true,
    min: 5
  },
  deliveryTime: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  revisions: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  features: [{
    type: String,
    maxlength: 50
  }],
  images: [{
    type: String,
    required: true
  }],
  questions: [{
    type: String,
    maxlength: 200
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
simpleGigSchema.index({ seller: 1 });
simpleGigSchema.index({ category: 1 });
simpleGigSchema.index({ 'rating.average': -1 });
simpleGigSchema.index({ totalOrders: -1 });
simpleGigSchema.index({ isActive: 1 });
simpleGigSchema.index({ price: 1 });
simpleGigSchema.index({ createdAt: -1 });

export const SimpleGig = mongoose.model<ISimpleGig>('SimpleGig', simpleGigSchema);
export default SimpleGig;