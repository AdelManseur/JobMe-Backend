import express from "express";
import {
  sendEmailController,
  sendBulkEmailController,
  sendTemplateEmailController,
} from "../controllers/email.controller";

const router = express.Router();

// Middleware to ensure JSON parsing
router.use((req, res, next) => {
  if (req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) {
    return res.status(400).json({
      success: false,
      message: "Content-Type must be application/json"
    });
  }
  next();
});

/**
 * @route POST /api/email/send
 * @desc Send a single email
 * @access Private (requires authentication)
 * @body { email: string, message: string }
 */
router.post("/send", sendEmailController);

/**
 * @route POST /api/email/send-bulk
 * @desc Send emails to multiple recipients
 * @access Private (requires authentication)
 * @body { emails: string[], message: string }
 */
router.post("/send-bulk", sendBulkEmailController);

/**
 * @route POST /api/email/send-template
 * @desc Send templated email
 * @access Private (requires authentication)
 * @body { email: string, template: string, data?: object }
 */
router.post("/send-template", sendTemplateEmailController);

/**
 * @route GET /api/email/templates
 * @desc Get available email templates
 * @access Private (requires authentication)
 */
router.get("/templates", (req, res) => {
  const templates = {
    welcome: {
      name: "Welcome Email",
      description: "Welcome new users to the platform",
      requiredData: ["name"],
      example: {
        template: "welcome",
        data: { name: "John Doe" }
      }
    },
    order_confirmation: {
      name: "Order Confirmation",
      description: "Confirm order creation",
      requiredData: ["buyerName", "orderId", "gigTitle", "amount", "expectedDelivery"],
      example: {
        template: "order_confirmation",
        data: {
          buyerName: "Jane Smith",
          orderId: "ORD-123",
          gigTitle: "Website Development",
          amount: "500",
          expectedDelivery: "7 days"
        }
      }
    },
    order_delivered: {
      name: "Order Delivered",
      description: "Notify when order is delivered",
      requiredData: ["buyerName", "orderId", "sellerName", "deliveredAt"],
      example: {
        template: "order_delivered",
        data: {
          buyerName: "Jane Smith",
          orderId: "ORD-123",
          sellerName: "John Doe",
          deliveredAt: "2025-11-28T10:00:00Z"
        }
      }
    },
    payment_received: {
      name: "Payment Received",
      description: "Notify seller of payment",
      requiredData: ["sellerName", "amount", "buyerName", "orderId"],
      example: {
        template: "payment_received",
        data: {
          sellerName: "John Doe",
          amount: "500",
          buyerName: "Jane Smith",
          orderId: "ORD-123"
        }
      }
    },
    custom: {
      name: "Custom Template",
      description: "Custom email content",
      requiredData: ["message"],
      example: {
        template: "custom",
        data: {
          message: "Your custom HTML content here"
        }
      }
    }
  };

  res.status(200).json({
    success: true,
    message: "Available email templates",
    data: templates,
  });
});

/**
 * @route GET /api/email/health
 * @desc Check email service health
 * @access Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Email service is running",
    timestamp: new Date().toISOString(),
    service: "Email Controller",
  });
});

export default router;