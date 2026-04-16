import { Router } from "express";
import {
  submitReport,
  getAllReports,
  getReportDetails,
  reviewReport,
  getSellerReports,
  getMyReports,
} from "../controllers/report.controller";
import multer from "multer";
import { protectRoute } from "../middleware/auth.middelware";
import { protectAdminRoute, requirePermission } from "../middleware/admin.middleware";

const router = Router();

// Multer configuration for report evidence uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|heic|heif|svg\+xml)$/i.test(
      file.mimetype
    );
    if (ok) return cb(null, true);
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only image files are allowed"
      )
    );
  },
});

// User endpoints - require authentication
router.post("/submit", protectRoute, upload.array('screenshots', 5), submitReport);
router.get("/my-reports", protectRoute, getMyReports);

// Public/Semi-public endpoints
router.get("/seller/:sellerId", getSellerReports);

// Admin endpoints - require authentication and admin role
router.get("/all", protectAdminRoute, requirePermission("view_reports"), getAllReports);
router.get("/:id", protectAdminRoute, requirePermission("view_reports"), getReportDetails);
router.put("/:id/review", protectAdminRoute, requirePermission("review_reports"), reviewReport);

export default router;
