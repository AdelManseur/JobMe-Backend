import { Router } from "express";
import {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrderById,
  updateOrderStatus,
  addDeliverable,
  requestRevision,
  addMessage,
  getOrderMessages,
  addReview,
  cancelOrder
} from "../controllers/order.controller";
import { protectRoute } from "../middleware/auth.middelware";
import { upload } from '../controllers/upload.controller';

const router = Router();

// All order routes require authentication
router.use(protectRoute);

// Order management
router.post("/", createOrder); // Create new order
router.get("/buyer", getBuyerOrders); // Get orders for logged-in buyer
router.get("/seller", getSellerOrders); // Get orders for logged-in seller
router.get("/:orderId", getOrderById); // Get single order
router.patch("/:orderId/status", updateOrderStatus); // Update order status
router.delete("/:orderId/cancel", cancelOrder); // Cancel order

// Order interactions
router.post("/:orderId/deliverables", upload.array("files", 10), addDeliverable); // Add deliverable
router.post("/:orderId/revisions", requestRevision); // Request revision
router.post("/:orderId/messages", upload.array("attachments", 5), addMessage); // Add message
router.get("/:orderId/messages", getOrderMessages); // Get order messages
router.post("/:orderId/review", addReview); // Add review

export default router;