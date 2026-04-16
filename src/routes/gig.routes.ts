import { Router } from "express";
import {
  createGig,
  getAllGigs,
  getGigById,
  getGigsBySeller,
  updateGig,
  deleteGig,
  toggleGigStatus,
  getCategories
} from "../controllers/gig.controller";
import { protectRoute } from "../middleware/auth.middelware";
import { upload } from '../controllers/upload.controller';

const router = Router();

// Public routes
router.get("/", getAllGigs); // Get all gigs with filters
router.get("/categories", getCategories); // Get available categories
router.get("/:gigId", getGigById); // Get single gig by ID
router.get("/seller/:sellerId", getGigsBySeller); // Get gigs by seller

// Protected routes (require authentication)
router.post("/", protectRoute, upload.array("images", 5), createGig); // Create new gig
router.put("/:gigId", protectRoute, upload.array("images", 5), updateGig); // Update gig
router.delete("/:gigId", protectRoute, deleteGig); // Delete gig
router.patch("/:gigId/toggle-status", protectRoute, toggleGigStatus); // Toggle active status

export default router;