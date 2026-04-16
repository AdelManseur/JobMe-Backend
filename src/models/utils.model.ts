import { Express } from "express";
import { IUser, User } from "./user.model";
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface DecodedToken {
  userId: string;
}