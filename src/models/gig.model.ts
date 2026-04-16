import mongoose, { Document, Schema } from "mongoose";

export interface IGig extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: {
    basic: {
      price: number;
      description: string;
      deliveryTime: number; // in days
      revisions: number;
      features: string[];
    };
    standard?: {
      price: number;
      description: string;
      deliveryTime: number;
      revisions: number;
      features: string[];
    };
    premium?: {
      price: number;
      description: string;
      deliveryTime: number;
      revisions: number;
      features: string[];
    };
  };
  images: string[]; // Array of image URLs
  seller: mongoose.Types.ObjectId; // Reference to User
  rating: {
    average: number;
    count: number;
  };
  totalOrders: number;
  isActive: boolean;
  faqs: {
    question: string;
    answer: string;
  }[];
  requirements: string[]; // What the seller needs from buyer
  createdAt: Date;
  updatedAt: Date;
}

const gigSchema = new Schema<IGig>({
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
      'Lifestyle',
    ]
  },
  subcategory: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    maxlength: 20
  }],
  price: {
    basic: {
      price: {
        type: Number,
        required: true,
        min: 5
      },
      description: {
        type: String,
        required: true,
        maxlength: 100
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
        min: 0
      },
      features: [{
        type: String,
        maxlength: 50
      }]
    },
    standard: {
      price: {
        type: Number,
        min: 5
      },
      description: {
        type: String,
        maxlength: 100
      },
      deliveryTime: {
        type: Number,
        min: 1,
        max: 30
      },
      revisions: {
        type: Number,
        min: 0
      },
      features: [{
        type: String,
        maxlength: 50
      }]
    },
    premium: {
      price: {
        type: Number,
        min: 5
      },
      description: {
        type: String,
        maxlength: 100
      },
      deliveryTime: {
        type: Number,
        min: 1,
        max: 30
      },
      revisions: {
        type: Number,
        min: 0
      },
      features: [{
        type: String,
        maxlength: 50
      }]
    }
  },
  images: [{
    type: String,
    required: true
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
  },
  faqs: [{
    question: {
      type: String,
      required: true,
      maxlength: 100
    },
    answer: {
      type: String,
      required: true,
      maxlength: 300
    }
  }],
  requirements: [{
    type: String,
    maxlength: 200
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
gigSchema.index({ seller: 1 });
gigSchema.index({ category: 1, subcategory: 1 });
gigSchema.index({ 'rating.average': -1 });
gigSchema.index({ totalOrders: -1 });
gigSchema.index({ isActive: 1 });
gigSchema.index({ createdAt: -1 });

export const Gig = mongoose.model<IGig>('Gig', gigSchema);
export default Gig;