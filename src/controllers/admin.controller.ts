import { Request, Response } from "express";
import { Admin, IAdmin } from "../models/admin.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Admin Login
export const adminLogin = async (req: Request, res: Response) => {
  console.log("adminLogin");
  try {
    console.log("adminLogin inside try");
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find admin
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log('admin checked');

    // Check if account is locked
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const lockTimeRemaining = Math.ceil(
        (admin.lockUntil.getTime() - Date.now()) / 1000 / 60
      );
      return res.status(403).json({
        error: "Account is temporarily locked",
        lockTimeRemaining: `${lockTimeRemaining} minutes`,
      });
    }

    // Check if account is suspended
    if (admin.status === 'suspended') {
      return res.status(403).json({ error: "Account is suspended" });
    }

    if (admin.status === 'inactive') {
      return res.status(403).json({ error: "Account is inactive" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // Increment login attempts
      admin.loginAttempts += 1;

      // Lock account after 5 failed attempts for 30 minutes
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await admin.save();
        return res.status(403).json({
          error: "Account locked due to multiple failed login attempts",
          lockDuration: "30 minutes",
        });
      }

      await admin.save();
      return res.status(401).json({
        error: "Invalid credentials",
        attemptsRemaining: 5 - admin.loginAttempts,
      });
    }

    // Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        type: 'admin'
      },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "8h" }
    );
    console.log('Token generated');
    console.log(`True or False: ${process.env.NODE_ENV === "production"}`);
    // Persist admin token in an httpOnly cookie so browser clients can
    // automatically use it for protected admin operations.
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.ADMIN_COOKIE_SAMESITE as "strict" | "lax" | "none") || "lax",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const GetMeAdmin = async (req: any, res: any) => {
  // req.user should be set by protectRoute
  console.log("GetMe")
  return res.status(200).json({
    logged: true,
    user: req.user,
  });
};

// Create Admin (Super Admin only)
export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    // Check if requester is super admin
    /*if ((req.user as any)?.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can create new admins" });
    }*/

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'moderator',
      permissions: permissions || {},
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions,
      },
    });
  } catch (error: any) {
    console.error("Create admin error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Admin Profile
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?._id;

    const admin = await Admin.findById(adminId).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({ admin });
  } catch (error: any) {
    console.error("Get admin profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update Admin Permissions (Super Admin only)
export const updateAdminPermissions = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { permissions, role } = req.body;

    // Check if requester is super admin
    if ((req.user as any)?.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can update permissions" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Update permissions
    if (permissions) {
      admin.permissions = { ...admin.permissions, ...permissions };
    }

    // Update role
    if (role) {
      admin.role = role;
    }

    await admin.save();

    res.json({
      message: "Admin updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error: any) {
    console.error("Update admin permissions error:", error);
    res.status(500).json({ error: error.message });
  }
};

// List All Admins (Super Admin only)
export const listAdmins = async (req: Request, res: Response) => {
  try {
    // Check if requester is super admin
    if ((req.user as any)?.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can view all admins" });
    }

    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });

    res.json({ admins, total: admins.length });
  } catch (error: any) {
    console.error("List admins error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Suspend/Activate Admin (Super Admin only)
export const updateAdminStatus = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { status } = req.body;

    // Check if requester is super admin
    if ((req.user as any)?.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can change admin status" });
    }

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    admin.status = status;
    await admin.save();

    res.json({
      message: `Admin ${status} successfully`,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
      },
    });
  } catch (error: any) {
    console.error("Update admin status error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin Logout
export const adminLogout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("admin_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.ADMIN_COOKIE_SAMESITE as "strict" | "lax" | "none") || "lax",
      path: "/",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error: any) {
    console.error("Admin logout error:", error);
    return res.status(500).json({ error: error.message });
  }
};