import mongoose, { Schema, Document } from "mongoose";

export interface IReaction {
  userId: Schema.Types.ObjectId;
  type: "like" | "love" | "helpful" | "insightful";
}

export interface IComment extends Document {
  userId: Schema.Types.ObjectId;
  username: string;
  userImage: string;
  
  // Polymorphic reference - can comment on different models
  onModel: "Gig" | "SimpleGig" | "Profile" | "Order" | "SimpleOrder";
  entityId: Schema.Types.ObjectId;
  
  content: string;
  
  // Rating (optional - for review-style comments)
  rating?: number;
  
  // Reactions
  reactions: IReaction[];
  likeCount: number;
  
  // Nested comments/replies
  parentCommentId?: Schema.Types.ObjectId;
  replies: Schema.Types.ObjectId[];
  replyCount: number;
  
  // Media attachments
  attachments: Array<{
    url: string;
    type: "image" | "video" | "document";
  }>;
  
  // Moderation
  status: "approved" | "pending" | "flagged" | "deleted";
  isEdited: boolean;
  
  // Helpful for seller responses
  isSellerResponse: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: { type: String, required: true },
    userImage: { type: String, default: "" },
    
    // Polymorphic reference
    onModel: {
      type: String,
      required: true,
      enum: ["Gig", "SimpleGig", "Profile", "Order", "SimpleOrder"],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "onModel",
    },
    
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    
    // Rating (optional)
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    
    // Reactions
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        type: {
          type: String,
          enum: ["like", "love", "helpful", "insightful"],
          default: "like",
        },
      },
    ],
    likeCount: { type: Number, default: 0 },
    
    // Nested comments
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    replies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    replyCount: { type: Number, default: 0 },
    
    // Media attachments
    attachments: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["image", "video", "document"],
          required: true,
        },
      },
    ],
    
    // Moderation
    status: {
      type: String,
      enum: ["approved", "pending", "flagged", "deleted"],
      default: "approved",
    },
    isEdited: { type: Boolean, default: false },
    
    // Seller response flag
    isSellerResponse: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for better query performance
commentSchema.index({ entityId: 1, onModel: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentCommentId: 1 });
commentSchema.index({ createdAt: -1 });

export const Comment = mongoose.model<IComment>("Comment", commentSchema);
