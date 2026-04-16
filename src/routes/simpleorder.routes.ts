import { Router } from "express";
import {
  createSimpleOrder,
  getSimpleBuyerOrders,
  getSimpleSellerOrders,
  getSimpleOrderById,
  updateSimpleOrderStatus,
  addSimpleDeliverable,
  requestSimpleRevision,
  addSimpleReview,
  cancelSimpleOrder,
  getSimpleOrderMessages,
  addSimpleOrderMessage,
  getSimpleOrderByTwoUsers
} from "../controllers/simpleorder.controller";
import { protectRoute } from "../middleware/auth.middelware";
import { upload } from '../controllers/upload.controller';

const router = Router();

// All simple order routes require authentication
router.use(protectRoute);

// Order management
router.post("/", createSimpleOrder); // Create new simple order
router.get("/buyer", getSimpleBuyerOrders); // Get orders for logged-in buyer
router.get("/seller", getSimpleSellerOrders); // Get orders for logged-in seller
router.get("/messages", getSimpleOrderMessages); // Get order messages

// Added by Me
router.get("/byusers", getSimpleOrderByTwoUsers); // Get order messages


router.get("/:orderId", getSimpleOrderById); // Get single simple order
router.patch("/:orderId/status", updateSimpleOrderStatus); // Update simple order status
router.delete("/:orderId/cancel", cancelSimpleOrder); // Cancel simple order

// Order interactions
router.post("/:orderId/deliverables", upload.array("files", 10), addSimpleDeliverable); // Add deliverable
router.post("/:orderId/revisions", requestSimpleRevision); // Request revision
router.post("/:orderId/review", addSimpleReview); // Add review

router.post("/:simpleOrderId/messages", upload.array("attachments", 5), addSimpleOrderMessage); // Add message
export default router;