import express from "express";
import {
  adminLogin,
  adminLogout,
  createAdmin,
  getAdminProfile,
  updateAdminPermissions,
  listAdmins,
  updateAdminStatus,
  GetMeAdmin,
} from "../controllers/admin.controller";
import { protectAdminRoute, requireSuperAdmin } from "../middleware/admin.middleware";

const router = express.Router();

// Public routes
router.post("/login", adminLogin);
// New endpoint
router.post("/logout", protectAdminRoute, adminLogout);

// Protected routes
router.get("/profile", protectAdminRoute, getAdminProfile);
router.get("/list", protectAdminRoute, requireSuperAdmin, listAdmins);
router.post("/create", protectAdminRoute, requireSuperAdmin, createAdmin);
router.patch("/:adminId/permissions", protectAdminRoute, requireSuperAdmin, updateAdminPermissions);
router.patch("/:adminId/status", protectAdminRoute, requireSuperAdmin, updateAdminStatus);

// New endpoint
router.get("/me", protectAdminRoute, GetMeAdmin);

export default router;
