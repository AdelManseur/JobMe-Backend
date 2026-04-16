import { Request, Response, NextFunction } from "express";
//import { v2 as cloudinary } from "cloudinary";
import cloudinary from "../lib/cloudinary";
import multer from "multer";
import streamifier from "streamifier";


export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
  
    const ok = /^image\/(png|jpe?g|webp|gif|heic|heif|svg\+xml)$/i.test(
      file.mimetype
    );
    console.log("File type:", file.mimetype, "Allowed:", ok);
    if (ok) return cb(null, true);
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only image files are allowed"
      )
    );
  },
});

export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Received file:", req.file ? req.file.originalname : "No file");
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const folder =
      typeof req.body.folder === "string" ? req.body.folder : "uploads";

    const cldOpts = { folder, resource_type: "image" as const };

    const uploadStream = cloudinary.uploader.upload_stream(
      cldOpts,
      (err, result) => {
        if (err || !result) {
          return next(err || new Error("Cloudinary upload failed"));
        }

        return res.status(201).json({
          url: result.secure_url,
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    next(err);
  }
};