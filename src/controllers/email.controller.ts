import { Request, Response } from "express";
import { sendEmail } from "../lib/email";

/**
 * Send Email Controller
 * POST /api/email/send
 */
export const sendEmailController = async (req: Request, res: Response) => {
  try {
    // Check if req.body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Invalid request body. Please send JSON data.",
      });
    }

    const { email, message, subject } = req.body;

    // Validation
    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: "Email and message are required",
        received: req.body,
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Send email
    await sendEmail(email, message);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: {
        email,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Send Bulk Email Controller
 * POST /api/email/send-bulk
 */
export const sendBulkEmailController = async (req: Request, res: Response) => {
  try {
    // Check if req.body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Invalid request body. Please send JSON data.",
      });
    }

    const { emails, message, subject } = req.body;

    // Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Emails array is required and must not be empty",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (emails.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 emails allowed per request",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        invalidEmails,
      });
    }

    // Send emails
    const results = [];
    const errors = [];

    for (const email of emails) {
      try {
        await sendEmail(email, message);
        results.push({
          email,
          status: "sent",
          sentAt: new Date().toISOString(),
        });
      } catch (error) {
        errors.push({
          email,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.length;
    const failureCount = errors.length;

    return res.status(200).json({
      success: true,
      message: `Bulk email completed. ${successCount} sent, ${failureCount} failed`,
      data: {
        successCount,
        failureCount,
        totalEmails: emails.length,
        results,
        errors,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending bulk emails:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send bulk emails",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Send Template Email Controller
 * POST /api/email/send-template
 */
export const sendTemplateEmailController = async (req: Request, res: Response) => {
  try {
    // Check if req.body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Invalid request body. Please send JSON data.",
      });
    }

    const { email, template, data } = req.body;

    // Validation
    if (!email || !template) {
      return res.status(400).json({
        success: false,
        message: "Email and template are required",
        received: req.body,
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Predefined templates
    const templates = {
      welcome: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #333; text-align: center;">Welcome to JobMe! 🎉</h2>
          <p>Hello ${data?.name || "there"},</p>
          <p>Welcome to JobMe! We're excited to have you join our freelance marketplace.</p>
          <p>Get started by:</p>
          <ul>
            <li>Creating your profile</li>
            <li>Browsing available gigs</li>
            <li>Starting your freelance journey</li>
          </ul>
          <p>Best regards,<br>The JobMe Team</p>
        </div>
      `,
      order_confirmation: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #28a745; text-align: center;">Order Confirmed! ✅</h2>
          <p>Hello ${data?.buyerName || "there"},</p>
          <p>Your order has been confirmed!</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> ${data?.orderId || "N/A"}</p>
            <p><strong>Gig:</strong> ${data?.gigTitle || "N/A"}</p>
            <p><strong>Amount:</strong> ${data?.amount || "N/A"} DZD</p>
            <p><strong>Expected Delivery:</strong> ${data?.expectedDelivery || "N/A"}</p>
          </div>
          <p>The seller will start working on your order shortly.</p>
          <p>Best regards,<br>The JobMe Team</p>
        </div>
      `,
      order_delivered: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #007bff; text-align: center;">Order Delivered! 📦</h2>
          <p>Hello ${data?.buyerName || "there"},</p>
          <p>Great news! Your order has been delivered.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Delivery Details:</h3>
            <p><strong>Order ID:</strong> ${data?.orderId || "N/A"}</p>
            <p><strong>Delivered by:</strong> ${data?.sellerName || "N/A"}</p>
            <p><strong>Delivered at:</strong> ${data?.deliveredAt || new Date().toISOString()}</p>
          </div>
          <p>Please review the work and mark as complete if satisfied.</p>
          <p>Best regards,<br>The JobMe Team</p>
        </div>
      `,
      payment_received: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #28a745; text-align: center;">Payment Received! 💰</h2>
          <p>Hello ${data?.sellerName || "there"},</p>
          <p>You've received a new payment!</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> ${data?.amount || "N/A"} DZD</p>
            <p><strong>From:</strong> ${data?.buyerName || "N/A"}</p>
            <p><strong>Order ID:</strong> ${data?.orderId || "N/A"}</p>
          </div>
          <p>The payment will be processed and available in your account.</p>
          <p>Best regards,<br>The JobMe Team</p>
        </div>
      `,
      custom: data?.message || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #333; text-align: center;">JobMe Notification</h2>
          <p>${data?.content || "Custom message content"}</p>
          <p>Best regards,<br>The JobMe Team</p>
        </div>
      `,
    };

    const templateContent = templates[template as keyof typeof templates];
    
    if (!templateContent) {
      return res.status(400).json({
        success: false,
        message: "Invalid template. Available templates: welcome, order_confirmation, order_delivered, payment_received, custom",
      });
    }

    // Send email with template
    await sendEmail(email, templateContent);

    return res.status(200).json({
      success: true,
      message: `Template email '${template}' sent successfully`,
      data: {
        email,
        template,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending template email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send template email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
