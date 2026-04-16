import { Schema, model, models, Document } from "mongoose";

export interface ISimpleOrderMessage extends Document {
  orderId: Schema.Types.ObjectId;
  from: Schema.Types.ObjectId;
  to: Schema.Types.ObjectId;
  role?: "buyer" | "seller" | string;
  message: string;
  attachments: string[];
  kind: "simpleOrderMessage";
  timestamp: Date;
  read: boolean;
}

const orderMessageSchema = new Schema<ISimpleOrderMessage>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ["buyer", "seller"],
      required: false
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [{
      type: String
    }],
    kind: {
      type: String,
      enum: ["simpleOrderMessage"],
      default: "simpleOrderMessage"
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }
);

// Indexes for efficient queries
orderMessageSchema.index({ orderId: 1, timestamp: 1 });
orderMessageSchema.index({ from: 1, to: 1 });

export const SimpleOrderMessage = models.SimpleOrderMessage || model<ISimpleOrderMessage>("SimpleOrderMessage", orderMessageSchema);