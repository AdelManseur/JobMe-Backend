import { Schema, model, models, Document } from "mongoose";

interface IConversation extends Document {
  user1Id: string;
  user2Id: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IConversation>(
  {
    user1Id: { type: String, required: true },
    user2Id: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


export const Conversation =
  models.Conversation || model<IConversation>("Conversation", messageSchema);
