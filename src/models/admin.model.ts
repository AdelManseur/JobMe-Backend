import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: {
    canManageFraud: boolean;
    canManageReports: boolean;
    canManageUsers: boolean;
    canViewAnalytics: boolean;
    canDeleteData: boolean;
    canManageAdmins: boolean;
  };
  status: 'active' | 'suspended' | 'inactive';
  lastLogin: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator'],
      default: 'moderator',
      required: true,
    },
    permissions: {
      canManageFraud: {
        type: Boolean,
        default: true,
      },
      canManageReports: {
        type: Boolean,
        default: true,
      },
      canManageUsers: {
        type: Boolean,
        default: false,
      },
      canViewAnalytics: {
        type: Boolean,
        default: true,
      },
      canDeleteData: {
        type: Boolean,
        default: false,
      },
      canManageAdmins: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
adminSchema.index({ email: 1 });
adminSchema.index({ status: 1 });

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
