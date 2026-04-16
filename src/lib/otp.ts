import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import Otp from "../models/otp.model";

import crypto from "crypto";

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}
export async function verifyOTP(email: string, otp: number): Promise<boolean> {
  const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });
  
  if (!otpRecord) {
    return false;
  }
  
  if (new Date() > otpRecord.expires) {
    return false;
  }
  
  const isValid = await bcrypt.compare(otp.toString(), otpRecord.hash);
  
  if (isValid) {
    await Otp.deleteOne({ _id: otpRecord._id });
  }
  
  return isValid;
}
export async function sendOTP(email: string): Promise<void> {
  const otpDigits = generateOTP(); 
  const hash = await bcrypt.hash(otpDigits, 10);

  const otpTtlMinutes = Number(process.env.OTP_TTL_MINUTES ?? 10);

  const UserOTP = new Otp({
    email,
    hash,
    expires: new Date(Date.now() + otpTtlMinutes * 60 * 1000),
  });
  await UserOTP.save();
  

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    type: "OAuth2",
    user:  process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    refreshToken:process.env.REFRESH_TOKEN,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
})
  await transporter.sendMail({
    from: `${process.env.EMAIL_USER || "kefifyoucef2020@gmail.com"}`,
    to: email,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: #ffffff; border: 1px solid #e9ecef; padding: 30px; border-radius: 8px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600; color: #2c3e50;">Verification Code</h1>
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #6c757d;">Enter this code to verify your account</p>
          <div style="background-color: #f8f9fa; border: 2px solid #28a745; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #28a745;">${otpDigits}</span>
          </div>
          <p style="margin: 0; font-size: 14px; color: #6c757d;">This code expires in ${otpTtlMinutes} minutes</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #6c757d;">
          <p style="margin: 0; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `,
  });
  
}