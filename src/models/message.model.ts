import { Schema, model, models, Document } from "mongoose";

interface IMessage extends Document {
  from: string;
  to: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

const messageSchema = new Schema<IMessage>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


export const Message =
  models.Message || model<IMessage>("Message", messageSchema);
