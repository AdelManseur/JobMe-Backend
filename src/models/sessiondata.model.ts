import "express-session";

export interface PendingUser {
  name: string;
  email: string;
  phone: string;
  bday: string;
  password: string;
  address: any;
  pfp: string;
}

declare module "express-session" {
  interface SessionData {
    pendingUser?: PendingUser;
  }
}