import { Request, Response, NextFunction, response } from "express";
import multer = require("multer");

export const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    const map: Record<string, string> = {
      LIMIT_FILE_SIZE: "File too large",
      LIMIT_FILE_COUNT: "Too many files",
      LIMIT_UNEXPECTED_FILE: "Invalid file",
    };
    return res
      .status(400)
      .json({ error: map[err.code] || "Upload error", code: err.code });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
};
