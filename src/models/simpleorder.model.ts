import { access } from "fs";
import mongoose, { Document, Schema } from "mongoose";

export interface ISimpleOrder extends Document {
  _id: mongoose.Types.ObjectId;
  gig: mongoose.Types.ObjectId; // Reference to SimpleGig
  buyer: mongoose.Types.ObjectId; // Reference to User
  seller: mongoose.Types.ObjectId; // Reference to User
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
  expectedDelivery: Date;
  actualDelivery?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  accessLevel?: "buyer" | "seller"; // virtual field, not stored in DB
}

const simpleOrderSchema = new Schema<ISimpleOrder>({
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SimpleGig',
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
  },
  accessLevel: {
    type: String,
    enum: ['buyer', 'seller']
}
}, {
  timestamps: true
});

// Indexes for better query performance
simpleOrderSchema.index({ buyer: 1, status: 1 });
simpleOrderSchema.index({ seller: 1, status: 1 });
simpleOrderSchema.index({ gig: 1 });
simpleOrderSchema.index({ status: 1 });
simpleOrderSchema.index({ 'payment.status': 1 });
simpleOrderSchema.index({ expectedDelivery: 1 });
simpleOrderSchema.index({ createdAt: -1 });

// Middleware to set expected delivery date
simpleOrderSchema.pre('save', function(next) {
  if (this.isNew && !this.expectedDelivery) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + this.deliveryTime);
    this.expectedDelivery = deliveryDate;
  }
  next();
});

export const SimpleOrder = mongoose.model<ISimpleOrder>('SimpleOrder', simpleOrderSchema);
export default SimpleOrder;