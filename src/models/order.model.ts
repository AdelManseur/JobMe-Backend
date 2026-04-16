import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  gig: mongoose.Types.ObjectId; // Reference to Gig
  buyer: mongoose.Types.ObjectId; // Reference to User
  seller: mongoose.Types.ObjectId; // Reference to User
  package: 'basic' | 'standard' | 'premium';
  price: number;
  deliveryTime: number; // in days
  revisions: number;
  status: 'pending' | 'active' | 'delivered' | 'completed' | 'cancelled' | 'in_revision';
  requirements: {
    question: string;
    answer: string;
  }[];
  deliverables: {
    files: string[]; // Array of file URLs
    description: string;
    deliveredAt: Date;
  }[];
  revisionRequests: {
    description: string;
    requestedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  payment: {
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'refunded';
    transactionId?: string;
    paidAt?: Date;
  };
  timeline: {
    ordered: Date;
    started?: Date;
    delivered?: Date;
    completed?: Date;
    cancelled?: Date;
  };
  review: {
    rating: number;
    comment: string;
    reviewedAt: Date;
  } | null;
  extras: {
    name: string;
    price: number;
    description: string;
  }[];
  totalAmount: number; // Including extras
  expectedDelivery: Date;
  actualDelivery?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  package: {
    type: String,
    enum: ['basic', 'standard', 'premium'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryTime: {
    type: Number,
    required: true,
    min: 1
  },
  revisions: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'delivered', 'completed', 'cancelled', 'in_revision'],
    default: 'pending'
  },
  requirements: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  deliverables: [{
    files: [{
      type: String
    }],
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  revisionRequests: [{
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  payment: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    transactionId: {
      type: String
    },
    paidAt: {
      type: Date
    }
  },
  timeline: {
    ordered: {
      type: Date,
      default: Date.now
    },
    started: {
      type: Date
    },
    delivered: {
      type: Date
    },
    completed: {
      type: Date
    },
    cancelled: {
      type: Date
    }
  },
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    reviewedAt: {
      type: Date
    }
  },
  extras: [{
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      maxlength: 200
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  expectedDelivery: {
    type: Date,
    required: true
  },
  actualDelivery: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: 300
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ gig: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ expectedDelivery: 1 });
orderSchema.index({ createdAt: -1 });

// Middleware to calculate total amount before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('price') || this.isModified('extras')) {
    const extrasTotal = this.extras.reduce((sum, extra) => sum + extra.price, 0);
    this.totalAmount = this.price + extrasTotal;
  }
  next();
});

// Middleware to set expected delivery date
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.expectedDelivery) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + this.deliveryTime);
    this.expectedDelivery = deliveryDate;
  }
  next();
});

export const Order = mongoose.model<IOrder>('Order', orderSchema);
export default Order;