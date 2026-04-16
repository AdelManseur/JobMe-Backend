import mongoose, { Schema, Document } from "mongoose";
export const userimg:string = "https://res.cloudinary.com/dztptq6q1/image/upload/v1756046508/user_rencds.png"
export interface IUser extends Document {
  _id: Schema.Types.Mixed ;
  name: string;
  email: string;
  phone: string;
  idVerified: boolean;
  pfp: string;
  bday: Date;
  password: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  fieldsOfInterest: Array<string>;
  status : boolean;
  lastOnline: Date;
  createdAt: Date; 
  updatedAt: Date; 
}


const userSchema = new Schema<IUser>(
  { 
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength:8 },
    phone: { type: String, required: true },
    idVerified: { type: Boolean, default: false },
    pfp: {
      type: String,
      default: userimg, // keep default only when no upload
    },
    bday: { type: Date, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    lastOnline: { type: Date, default: Date.now },
    status : {type: Boolean , default: true},
    fieldsOfInterest: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
