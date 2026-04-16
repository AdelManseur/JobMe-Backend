import { Schema, model, models, Document } from "mongoose";

export interface IOrderMessage extends Document {
  orderId: Schema.Types.ObjectId;
  from: Schema.Types.ObjectId;
  to: Schema.Types.ObjectId;
  message: string;
  attachments: string[];
  timestamp: Date;
  read: boolean;
}

const orderMessageSchema = new Schema<IOrderMessage>(
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
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [{
      type: String
    }],
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

export const OrderMessage = models.OrderMessage || model<IOrderMessage>("OrderMessage", orderMessageSchema);