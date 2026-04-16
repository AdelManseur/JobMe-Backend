import { Router } from "express";
import {
  createSimpleGig,
  getAllSimpleGigs,
  getSimpleGigById,
  getSimpleGigsBySeller,
  updateSimpleGig,
  deleteSimpleGig,
  toggleSimpleGigStatus,
  getSimpleGigCategories
} from "../controllers/simplegig.controller";
import { protectRoute } from "../middleware/auth.middelware";
import { upload } from '../controllers/upload.controller';

const router = Router();

// Public routes
router.get("/", getAllSimpleGigs); // Get all simple gigs with filters
router.get("/categories", getSimpleGigCategories); // Get available categories
router.get("/:gigId", getSimpleGigById); // Get single simple gig by ID
router.get("/seller/:sellerId", getSimpleGigsBySeller); // Get simple gigs by seller

// Protected routes (require authentication)
router.post("/", protectRoute, upload.array("images", 5), createSimpleGig); // Create new simple gig
router.put("/:gigId", protectRoute, upload.array("images", 5), updateSimpleGig); // Update simple gig
router.delete("/:gigId", protectRoute, deleteSimpleGig); // Delete simple gig
router.patch("/:gigId/toggle-status", protectRoute, toggleSimpleGigStatus); // Toggle active status

export default router;