import { Router } from "express";
import {
  flagUserAsFraud,
  getFlaggedUsers,
  getFraudCaseDetails,
  reviewFraudCase,
  resolveFraudCase,
  getFraudStatistics,
  checkUserFraudStatus,
  addNoteToFraudCase,
} from "../controllers/frauduser.controller";
import { protectAdminRoute, requirePermission } from "../middleware/admin.middleware";

const router = Router();

// AI endpoint - flag a user (can be called programmatically)
router.post("/flag", flagUserAsFraud);

// Check user's fraud status (before processing transactions)
router.get("/check/:userId", checkUserFraudStatus);

// Admin endpoints - require authentication and admin role
router.get("/cases", protectAdminRoute, requirePermission("view_fraud_cases"), getFlaggedUsers);
router.get("/cases/:id", protectAdminRoute, requirePermission("view_fraud_cases"), getFraudCaseDetails);
router.put("/cases/:id/review", protectAdminRoute, requirePermission("review_fraud_cases"), reviewFraudCase);
router.put("/cases/:id/resolve", protectAdminRoute, requirePermission("resolve_fraud_cases"), resolveFraudCase);
router.post("/cases/:id/notes", protectAdminRoute, requirePermission("manage_fraud_cases"), addNoteToFraudCase);
router.get("/statistics", protectAdminRoute, requirePermission("view_fraud_statistics"), getFraudStatistics);

export default router;
