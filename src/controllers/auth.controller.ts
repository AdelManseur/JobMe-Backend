import { Request, Response, NextFunction, response } from "express";
import {  User } from "../models/user.model";
import bcrypt from "bcrypt";
import { generateToken } from "../lib/utils";
import cloudinary from "../lib/cloudinary";
import { userimg } from "../models/user.model";
import { sendOTP } from "../lib/otp";
export const SignIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const metadata =
      typeof req.body.metadata === "string" ? JSON.parse(req.body.metadata) : req.body;

    const {
      name,
      email,
      password,
      phone,
      bday,
      address,
      fieldsOfInterest = [],
    } = metadata;

    if (!name || !email || !password || !phone || !bday || !address) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let pfp = userimg;
    if (req.file) {
      const file = req.file;
      const folder =
        typeof req.body.folder === "string" ? req.body.folder : "uploads";
      const cldOpts = { folder, resource_type: "image" as const };

      try {
        const uploadResult: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            cldOpts,
            (err, result) => {
              if (err || !result)
                return reject(err || new Error("Cloudinary upload failed"));
              resolve(result);
            }
          );
          stream.end(file.buffer); 
          console.log("File buffer sent to Cloudinary stream"); // Debug log after sending file
        });

        pfp = uploadResult.secure_url;
        console.log("Cloudinary upload successful, URL:", pfp); // Debug log for successful upload
      } catch (uploadErr) {
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    const DEFAULT_PFP =
      "https://res.cloudinary.com/dztptq6q1/image/upload/v1756046508/user_rencds.png";

    const pendingUserData = {
      name,
      email,
      password: hashedPassword,
      phone,
      bday,
      address,
      fieldsOfInterest,
      pfp: pfp || DEFAULT_PFP, // FIX: do not always force default
      status: true,
      lastOnline: new Date(),
    };

    req.session.pendingUser = pendingUserData;

    await sendOTP(email);

    // Ensure session is persisted before response
    req.session.save((err) => {
      if (err) return next(err);
      return res.status(200).json({
        message: "OTP sent successfully",
        redirect: "/verify-otp",
      });
    });
  } catch (error) {
    next(error);
  }
};

export const LogIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lastOnline: Date = new Date();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    // FIX: block login when password is invalid
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastOnline = lastOnline;
    await user.save();

    generateToken(user._id.toString(), res);

    return res.status(200).json({
      message: "User logged in successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        pfp: user.pfp,
        lastOnline: user.lastOnline,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const GetMe = async (req: any, res: any) => {
  // req.user should be set by protectRoute
  return res.status(200).json({
    logged: true,
    user: req.user,
  });
};

export const LogOut = (req: Request, res: Response, next: NextFunction) => {
  console.log("logout");
  try {
    console.log("logouttttttt");
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const UpdateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("UpdateProfile called with metadata:", req.body.metadata);
    const userId = req.user?._id.toString();
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let metadata;
    try {
      metadata = JSON.parse(req.body.metadata);
    } catch (err) {
      return res.status(400).json({ message: "Invalid metadata JSON" });
    }

    const updateData: any = {};

    if (metadata.changePass) {
      const { npassword } = metadata;
      if (!npassword || typeof npassword !== "string" || npassword.length < 8) {
        return res.status(400).json({ message: "Invalid password" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(npassword, salt);
      updateData.password = hashedPassword;
    }

    if (metadata.changeAdd) {
      const { naddress } = metadata;
      if (
        !naddress ||
        typeof naddress !== "object" ||
        Array.isArray(naddress)
      ) {
        return res.status(400).json({ message: "Invalid address format" });
      }

      const { street, city, postalCode, country } = naddress;

      if (
        !street ||
        typeof street !== "string" ||
        !city ||
        typeof city !== "string" ||
        !postalCode ||
        typeof postalCode !== "string" ||
        !country ||
        typeof country !== "string"
      ) {
        return res.status(400).json({ message: "Invalid address fields" });
      }

      updateData.address = {
        street,
        city,
        postalCode,
        country,
      };
    }

    if (metadata.changeFOI) {
      const { nfieldsOfInterest } = metadata;
      if (!Array.isArray(nfieldsOfInterest)) {
        return res.status(400).json({ message: "Invalid fields of interest" });
      }
      updateData.fieldsOfInterest = nfieldsOfInterest;
    }

    if (req.file) {
      const file = req.file;
      const folder =
        typeof req.body.folder === "string" ? req.body.folder : "uploads";
      
      const cldOpts = { folder, resource_type: "image" as const };

      try {
        const uploadResult: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            cldOpts,
            (err, result) => {
              if (err || !result) {
                return reject(err || new Error("Cloudinary upload failed"));
              }
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        updateData.pfp = uploadResult.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No changes requested" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("UpdateProfile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// New controller function but it's not auth, it's user details
export const GetDetails = async (req: any, res: any) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        pfp: user.pfp,
      },
    });
  } catch (error) {
    console.error("GetDetails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};