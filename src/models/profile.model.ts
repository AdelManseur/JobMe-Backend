import mongoose, { Schema, Document } from "mongoose";

export interface IEducation {
  school: string;
  field: string;
  degree: string;
  endYear: number;
  description?: string;
}

export interface ICertification {
  name: string;
  issuer: string;
  issuedDate: Date;
  expiryDate?: Date;
  certificateUrl?: string;
}

export interface IExperience {
  title: string;
  company: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  isCurrentlyWorking: boolean;
}

export interface ILanguage {
  language: string;
  proficiency: "Basic" | "Intermediate" | "Advanced" | "Fluent";
}

export interface IReview {
  userId: Schema.Types.ObjectId;
  username: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IProfile extends Document {
  userId: Schema.Types.ObjectId;
  bio: string;
  title: string;
  description: string;
  skills: Array<string>;
  languages: ILanguage[];
  hourlyRate?: number;
  profileImage: string;
  coverImage?: string;
  
  // Professional Information
  education: IEducation[];
  experience: IExperience[];
  certifications: ICertification[];
  
  // Ratings and Reviews
  rating: number;
  reviews: IReview[];
  totalReviews: number;
  
  // Seller Stats
  totalOrders: number;
  responseTime: number; // in minutes
  responseRate: number; // percentage (0-100)
  repeatCustomerRate: number; // percentage (0-100)
  
  // Availability
  availability: "Available" | "Partly Available" | "Not Available";
  
  // Portfolio/Work Samples
  portfolio: Array<{
    title: string;
    description: string;
    images: string[];
    link?: string;
  }>;
  
  // Social Links
  socialLinks: {
    portfolio?: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  
  // Additional Info
  verificationStatus: "Verified" | "Unverified";
  isFeatured: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bio: { type: String, maxlength: 500, default: "" },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    skills: { type: [String], default: [] },
    languages: [
      {
        language: { type: String, required: true },
        proficiency: {
          type: String,
          enum: ["Basic", "Intermediate", "Advanced", "Fluent"],
          default: "Intermediate",
        },
      },
    ],
    hourlyRate: { type: Number, min: 0 },
    profileImage: {
      type: String,
      default:
        "https://res.cloudinary.com/dztptq6q1/image/upload/v1756046508/user_rencds.png",
    },
    coverImage: { type: String },

    // Professional Information
    education: [
      {
        school: { type: String, required: true },
        field: { type: String, required: true },
        degree: { type: String, required: true },
        endYear: { type: Number, required: true },
        description: { type: String },
      },
    ],
    experience: [
      {
        title: { type: String, required: true },
        company: { type: String, required: true },
        description: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        isCurrentlyWorking: { type: Boolean, default: false },
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        issuer: { type: String, required: true },
        issuedDate: { type: Date, required: true },
        expiryDate: { type: Date },
        certificateUrl: { type: String },
      },
    ],

    // Ratings and Reviews
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        username: { type: String },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    totalReviews: { type: Number, default: 0 },

    // Seller Stats
    totalOrders: { type: Number, default: 0 },
    responseTime: { type: Number, default: 60 }, // in minutes
    responseRate: { type: Number, default: 0, min: 0, max: 100 },
    repeatCustomerRate: { type: Number, default: 0, min: 0, max: 100 },

    // Availability
    availability: {
      type: String,
      enum: ["Available", "Partly Available", "Not Available"],
      default: "Available",
    },

    // Portfolio/Work Samples
    portfolio: [
      {
        title: { type: String, required: true },
        description: { type: String },
        images: [{ type: String }],
        link: { type: String },
      },
    ],

    // Social Links
    socialLinks: {
      portfolio: { type: String },
      github: { type: String },
      linkedin: { type: String },
      twitter: { type: String },
    },

    // Additional Info
    verificationStatus: {
      type: String,
      enum: ["Verified", "Unverified"],
      default: "Unverified",
    },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Profile = mongoose.model<IProfile>("Profile", profileSchema);
