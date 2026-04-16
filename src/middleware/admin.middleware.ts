import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model";

interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
  permissions: any;
  type: string;
}

const getTokenFromCookieHeader = (cookieHeader?: string): string | undefined => {
  if (!cookieHeader) {
    return undefined;
  }

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === "admin_token") {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return undefined;
};

// Protect admin routes - verify JWT token
export const protectAdminRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('Protect route');
  try {
    // Get token from Authorization header first, then fall back to cookie.
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;
    const tokenFromCookie = (req as any).cookies?.admin_token as string | undefined;
    const tokenFromRawCookie = getTokenFromCookieHeader(req.headers.cookie);
    const token = tokenFromHeader || tokenFromCookie || tokenFromRawCookie;

    if (!token) {
      console.log("!Token");
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret-key"
    ) as AdminTokenPayload;

    // Check if token is for admin
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: "Access denied - Admin only" });
    }

    // Get admin from database
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if account is active
    if (admin.status !== 'active') {
      return res.status(403).json({ error: "Account is not active" });
    }

    // Attach admin to request
    req.user = admin as any;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("Admin auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

// Check specific permissions
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = req.user as any;

    if (!admin) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Super admin has all permissions
    if (admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has the required permission
    if (!admin.permissions || !admin.permissions[permission]) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: permission 
      });
    }

    next();
  };
};

// Require super admin role
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const admin = req.user as any;

  if (!admin || admin.role !== 'super_admin') {
    return res.status(403).json({ error: "Super admin access required" });
  }

  next();
};