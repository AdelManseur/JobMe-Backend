import mongoose, { Document, Schema } from "mongoose";

export interface IFraudUser extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId; // Reference to User
  fraudScore: number; // 0-100
  status: 'pending_review' | 'confirmed_fraud' | 'false_positive' | 'monitoring';
  
  // AI Detection Details
  aiAnalysis: {
    model: string; // AI model used for detection
    confidence: number; // 0-100
    detectedAt: Date;
    analysisVersion: string;
  };
  
  // Detailed Flags and Reasons
  flags: {
    category: 'behavioral' | 'transactional' | 'account' | 'pattern' | 'payment';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: any; // Flexible field for storing evidence data
    detectedAt: Date;
  }[];
  
  // Triggering Event/Order
  triggeringEvent: {
    type: 'order' | 'message' | 'profile_update' | 'payment' | 'review' | 'other';
    referenceId?: mongoose.Types.ObjectId; // Reference to order, message, etc.
    details: any; // Specific details about the event
    timestamp: Date;
  };
  
  // User Behavior Data at Time of Flagging
  userSnapshot: {
    accountAge: number; // in days
    totalOrders: number;
    cancelledOrders: number;
    completedOrders: number;
    averageOrderValue: number;
    totalSpent: number;
    totalEarned: number;
    verificationStatus: {
      email: boolean;
      phone: boolean;
      identity: boolean;
    };
    recentActivity: {
      ordersLast24h: number;
      ordersLast7days: number;
      messagesLast24h: number;
      loginLocations: string[];
      deviceInfo: string[];
    };
  };
  
  // Suspicious Patterns Detected
  suspiciousPatterns: {
    pattern: string;
    occurrences: number;
    severity: 'low' | 'medium' | 'high';
    examples: any[];
  }[];
  
  // Admin Review Information
  review: {
    reviewedBy?: mongoose.Types.ObjectId; // Reference to Admin User
    reviewedAt?: Date;
    decision: 'pending' | 'confirmed' | 'dismissed' | 'needs_more_info';
    notes: string;
    actionTaken?: {
      type: 'account_suspended' | 'account_banned' | 'funds_held' | 'warning_issued' | 'no_action';
      appliedAt: Date;
      appliedBy: mongoose.Types.ObjectId;
      details: string;
    };
  };
  
  // Historical Context
  priorFlags: {
    flaggedAt: Date;
    reason: string;
    resolved: boolean;
    resolution?: string;
  }[];
  
  // Related Fraud Cases
  relatedCases: mongoose.Types.ObjectId[]; // References to other FraudUser documents
  
  // Risk Assessment
  riskAssessment: {
    immediateRisk: boolean; // Requires immediate action
    potentialLoss: number; // Estimated monetary impact
    affectedUsers: number; // How many other users might be affected
    recommendedAction: 'immediate_suspension' | 'monitor_closely' | 'manual_review' | 'automated_limits';
  };
  
  // Resolution
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: {
    outcome: 'fraud_confirmed' | 'false_alarm' | 'preventive_action_taken';
    details: string;
    resolvedBy: mongoose.Types.ObjectId;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
}

const FraudUserSchema = new Schema<IFraudUser>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fraudScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending_review', 'confirmed_fraud', 'false_positive', 'monitoring'],
      default: 'pending_review',
      index: true,
    },
    aiAnalysis: {
      model: {
        type: String,
        default: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
      detectedAt: {
        type: Date,
        default: Date.now,
      },
      analysisVersion: {
        type: String,
        default: '1.0',
      },
    },
    flags: [
      {
        category: {
          type: String,
          enum: ['behavioral', 'transactional', 'account', 'pattern', 'payment'],
          required: true,
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        evidence: Schema.Types.Mixed,
        detectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    triggeringEvent: {
      type: {
        type: String,
        enum: ['order', 'message', 'profile_update', 'payment', 'review', 'other'],
        required: true,
      },
      referenceId: Schema.Types.ObjectId,
      details: Schema.Types.Mixed,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    userSnapshot: {
      accountAge: Number,
      totalOrders: Number,
      cancelledOrders: Number,
      completedOrders: Number,
      averageOrderValue: Number,
      totalSpent: Number,
      totalEarned: Number,
      verificationStatus: {
        email: Boolean,
        phone: Boolean,
        identity: Boolean,
      },
      recentActivity: {
        ordersLast24h: Number,
        ordersLast7days: Number,
        messagesLast24h: Number,
        loginLocations: [String],
        deviceInfo: [String],
      },
    },
    suspiciousPatterns: [
      {
        pattern: String,
        occurrences: Number,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        examples: [Schema.Types.Mixed],
      },
    ],
    review: {
      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      decision: {
        type: String,
        enum: ['pending', 'confirmed', 'dismissed', 'needs_more_info'],
        default: 'pending',
      },
      notes: {
        type: String,
        default: '',
      },
      actionTaken: {
        type: {
          type: String,
          enum: ['account_suspended', 'account_banned', 'funds_held', 'warning_issued', 'no_action'],
        },
        appliedAt: Date,
        appliedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        details: String,
      },
    },
    priorFlags: [
      {
        flaggedAt: Date,
        reason: String,
        resolved: Boolean,
        resolution: String,
      },
    ],
    relatedCases: [
      {
        type: Schema.Types.ObjectId,
        ref: "FraudUser",
      },
    ],
    riskAssessment: {
      immediateRisk: {
        type: Boolean,
        default: false,
      },
      potentialLoss: {
        type: Number,
        default: 0,
      },
      affectedUsers: {
        type: Number,
        default: 0,
      },
      recommendedAction: {
        type: String,
        enum: ['immediate_suspension', 'monitor_closely', 'manual_review', 'automated_limits'],
        default: 'manual_review',
      },
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: Date,
    resolution: {
      outcome: {
        type: String,
        enum: ['fraud_confirmed', 'false_alarm', 'preventive_action_taken'],
      },
      details: String,
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
FraudUserSchema.index({ user: 1, status: 1 });
FraudUserSchema.index({ fraudScore: -1, status: 1 });
FraudUserSchema.index({ 'aiAnalysis.detectedAt': -1 });
FraudUserSchema.index({ resolved: 1, 'riskAssessment.immediateRisk': -1 });

const FraudUser = mongoose.model<IFraudUser>("FraudUser", FraudUserSchema);
export default FraudUser;
