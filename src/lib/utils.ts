import jwt from "jsonwebtoken";
import { Response } from "express";
export const generateToken = (userId: string, res: Response)=>{

    const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("❌ ERROR: JWT_SECRET is undefined in process.env");
    // Return a dummy token or handle the error gracefully
    throw new Error("Internal Server Error: Security configuration missing");
  }
  
const token = jwt.sign({userId}, secret, {
    expiresIn:"7d"
})
res.cookie("jwt",token , {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000 
})

return token ;
}

