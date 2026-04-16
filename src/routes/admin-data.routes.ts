import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllOrders,
  searchPlatform,
  getAnalytics,
} from "../controllers/admin-data.controller";
import { protectAdminRoute, requirePermission } from "../middleware/admin.middleware";

const router = express.Router();

// All routes require admin authentication
router.use(protectAdminRoute);

// Dashboard
router.get("/dashboard/stats", requirePermission("canViewAnalytics"), getDashboardStats);
router.get("/analytics", requirePermission("canViewAnalytics"), getAnalytics);

// Users
router.get("/users", requirePermission("canManageUsers"), getAllUsers);
router.get("/users/:userId", requirePermission("canManageUsers"), getUserDetails);
router.patch("/users/:userId/status", requirePermission("canManageUsers"), updateUserStatus);

// Orders
router.get("/orders", requirePermission("canViewAnalytics"), getAllOrders);

// Search
router.get("/search", searchPlatform);

export default router;
