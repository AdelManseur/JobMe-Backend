import mongoose, { Document, Schema } from "mongoose";

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId; // Buyer reporting
  reportedUser: mongoose.Types.ObjectId; // Seller being reported
  order: mongoose.Types.ObjectId; // Related order
  
  // Report Details
  category: 'non_delivery' | 'fake_service' | 'poor_quality' | 'scam' | 'overcharge' | 'harassment' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: {
    screenshots?: string[]; // URLs to uploaded images
    messages?: string[]; // Chat message references
    files?: string[];
    additionalInfo?: any;
  };
  
  // Reporter Credibility
  reporterCredibility: {
    fraudScore: number; // Reporter's fraud score at time of report
    totalOrders: number;
    accountAge: number;
    verifiedAccount: boolean;
    credibilityScore: number; // 0-100, higher = more trustworthy
    priorReports: number;
    priorReportsAccepted: number;
  };
  
  // Status
  status: 'pending' | 'under_review' | 'accepted' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Admin Review
  review: {
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    decision: 'pending' | 'valid' | 'invalid' | 'needs_investigation';
    notes: string;
    actionTaken?: {
      type: 'warning_issued' | 'seller_flagged' | 'seller_suspended' | 'no_action' | 'refund_issued';
      appliedAt: Date;
      details: string;
    };
  };
  
  // Impact
  impact: {
    sellerFraudScoreAdjustment?: number; // How much this report affected seller's fraud score
    fraudCaseCreated?: mongoose.Types.ObjectId; // If this triggered a fraud case
    similarReports?: number; // Count of similar reports against this seller
  };
  
  // Resolution
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: {
    outcome: string;
    details: string;
    refunded: boolean;
    compensationAmount?: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['non_delivery', 'fake_service', 'poor_quality', 'scam', 'overcharge', 'harassment', 'other'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000,
    },
    evidence: {
      screenshots: [String],
      messages: [String],
      files: [String],
      additionalInfo: Schema.Types.Mixed,
    },
    reporterCredibility: {
      fraudScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      totalOrders: Number,
      accountAge: Number,
      verifiedAccount: Boolean,
      credibilityScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      priorReports: Number,
      priorReportsAccepted: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'accepted', 'rejected', 'resolved'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    review: {
      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      decision: {
        type: String,
        enum: ['pending', 'valid', 'invalid', 'needs_investigation'],
        default: 'pending',
      },
      notes: {
        type: String,
        default: '',
      },
      actionTaken: {
        type: {
          type: String,
          enum: ['warning_issued', 'seller_flagged', 'seller_suspended', 'no_action', 'refund_issued'],
        },
        appliedAt: Date,
        details: String,
      },
    },
    impact: {
      sellerFraudScoreAdjustment: Number,
      fraudCaseCreated: {
        type: Schema.Types.ObjectId,
        ref: "FraudUser",
      },
      similarReports: {
        type: Number,
        default: 0,
      },
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: Date,
    resolution: {
      outcome: String,
      details: String,
      refunded: Boolean,
      compensationAmount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ReportSchema.index({ reportedUser: 1, status: 1 });
ReportSchema.index({ reporter: 1, createdAt: -1 });
ReportSchema.index({ status: 1, priority: -1 });
ReportSchema.index({ 'reporterCredibility.credibilityScore': -1 });

const Report = mongoose.model<IReport>("Report", ReportSchema);
export default Report;
