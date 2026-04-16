import { Request, Response, NextFunction, response } from "express";
import { generateToken} from "../lib/utils";
import {  User } from "../models/user.model";
import { verifyOTP } from "../lib/otp";
import { PendingUser } from "../models/sessiondata.model";
import { verifyFaceWithInsightService } from "../services/faceVerification.service";

export const verifyOTPAndCreateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const pendingUserData = req.session.pendingUser;

    if (!pendingUserData || !pendingUserData.email) {
      return res.status(400).json({ message: "Registration session expired" });
    }

    const email = pendingUserData.email;

    try {
      await verifyOTP(email, otp);
    } catch (error) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const newUser = new User(pendingUserData);
    await newUser.save();

    req.session.pendingUser = undefined;

    generateToken(newUser._id.toString(), res);

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyIdFace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    const idImage = files?.idImage?.[0];
    const selfies = [...(files?.selfies || []), ...(files?.selfie || [])];

    if (!idImage) {
      return res.status(400).json({
        message: "idImage is required",
      });
    }

    if (selfies.length < 2 || selfies.length > 5) {
      return res.status(400).json({
        message: "Provide between 2 and 5 selfie images",
        selfiesReceived: selfies.length,
      });
    }

    const result = await verifyFaceWithInsightService(idImage, selfies);
    const idVerified = result.match;

    if (idVerified) {
      await User.findByIdAndUpdate(userId, { idVerified: true });
    }

    return res.status(200).json({
      match: result.match,
      confidence: result.confidence,
      similarity: result.similarity,
      threshold: result.threshold,
      explanation: result.explanation,
      selfieDiagnostics: result.selfie_diagnostics,
      idVerified,
    });
  } catch (error) {
    next(error);
  }
};
