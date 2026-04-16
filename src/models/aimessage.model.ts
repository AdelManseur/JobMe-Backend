
import { Schema, model, models, Document } from "mongoose";

interface IAIMessage extends Document {
  from: string;
  to: string;
  content: string;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAIMessage>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AIMessage =
  models.AIMessage || model<IAIMessage>("AIMessage", aiMessageSchema);
