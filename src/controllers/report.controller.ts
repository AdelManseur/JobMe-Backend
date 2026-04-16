import { Request, Response } from "express";
import Report from "../models/report.model";
import FraudUser from "../models/frauduser.model";
import Order from "../models/order.model";
import SimpleOrder from "../models/simpleorder.model";
import { User } from "../models/user.model";
import { analyzeSellerForFraud } from "../services/fraud-detection.service";
import cloudinary from "../lib/cloudinary";
import streamifier from "streamifier";

// Calculate reporter credibility score
const calculateCredibilityScore = (reporterData: {
  fraudScore: number;
  totalOrders: number;
  accountAge: number;
  verifiedAccount: boolean;
  priorReports: number;
  priorReportsAccepted: number;
}): number => {
  let score = 100;

  // Penalize if reporter has high fraud score (likely fraudulent themselves)
  if (reporterData.fraudScore >= 70) {
    score -= 50; // Major penalty for fraudulent reporters
  } else if (reporterData.fraudScore >= 50) {
    score -= 30;
  } else if (reporterData.fraudScore >= 30) {
    score -= 15;
  }

  // Bonus for verified account
  if (reporterData.verifiedAccount) {
    score += 10;
  }

  // Bonus for established account
  if (reporterData.accountAge >= 90) {
    score += 10;
  } else if (reporterData.accountAge >= 30) {
    score += 5;
  }

  // Bonus for order history
  if (reporterData.totalOrders >= 10) {
    score += 10;
  } else if (reporterData.totalOrders >= 5) {
    score += 5;
  }

  // Factor in prior report accuracy
  if (reporterData.priorReports > 0) {
    const acceptanceRate = reporterData.priorReportsAccepted / reporterData.priorReports;
    if (acceptanceRate >= 0.8) {
      score += 15; // Reliable reporter
    } else if (acceptanceRate < 0.3) {
      score -= 20; // Unreliable reporter
    }
  }

  return Math.max(0, Math.min(100, score));
};

// Submit a report (Buyer reports Seller)
export const submitReport = async (req: Request, res: Response) => {
  try {
    const reporterId = req.user?._id;
    
    // Parse body data (could be JSON or multipart)
    let reportData;
    if (req.body.data) {
      // If using multipart with files, data is in req.body.data
      reportData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      reportData = req.body;
    }
    
    const {
      reportedUserId,
      orderId,
      category,
      severity,
      description,
      evidence,
    } = reportData;

    if (!reporterId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate minimum description length
    if (!description || description.length < 20) {
      return res.status(400).json({
        error: "Description must be at least 20 characters",
      });
    }

    // Upload screenshots to Cloudinary if files provided
    const screenshotUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try {
          const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'reports/evidence',
                resource_type: 'image',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          });
          
          screenshotUrls.push(uploadResult.secure_url);
        } catch (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          // Continue with other uploads even if one fails
        }
      }
    }

    // Merge uploaded URLs with any provided URLs
    const finalEvidence = {
      screenshots: [
        ...screenshotUrls,
        ...(evidence?.screenshots || [])
      ],
      messages: evidence?.messages || [],
      files: evidence?.files || [],
      additionalInfo: evidence?.additionalInfo || {},
    };

    // Verify order exists and reporter is the buyer
    const order = await Order.findById(orderId) || await SimpleOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.buyer.toString() !== reporterId.toString()) {
      return res.status(403).json({
        error: "You can only report orders you purchased",
      });
    }

    if (order.seller.toString() !== reportedUserId) {
      return res.status(400).json({
        error: "Reported user must be the seller of this order",
      });
    }

    // Check if already reported this order
    const existingReport = await Report.findOne({
      reporter: reporterId,
      order: orderId,
    });

    if (existingReport) {
      return res.status(400).json({
        error: "You have already reported this order",
        existingReport: existingReport._id,
      });
    }

    // Get reporter's fraud score and credibility
    const reporter = await User.findById(reporterId);
    const reporterFraudCheck = await FraudUser.findOne({
      user: reporterId,
      resolved: false,
    });

    const reporterFraudScore = reporterFraudCheck?.fraudScore || 0;

    // Get reporter's order history
    const reporterOrders = [
      ...(await Order.find({ buyer: reporterId })),
      ...(await SimpleOrder.find({ buyer: reporterId })),
    ];

    // Get prior reports
    const priorReports = await Report.find({ reporter: reporterId });
    const priorReportsAccepted = priorReports.filter(
      (r) => r.review.decision === "valid"
    ).length;

    const accountAge = Math.floor(
      (Date.now() - reporter!.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const reporterCredibility = {
      fraudScore: reporterFraudScore,
      totalOrders: reporterOrders.length,
      accountAge,
      verifiedAccount: (reporter as any)?.verifiedEmail || false,
      priorReports: priorReports.length,
      priorReportsAccepted,
    };

    const credibilityScore = calculateCredibilityScore(reporterCredibility);

    // Block reports from low credibility users
    if (credibilityScore < 30) {
      return res.status(403).json({
        error: "Your account does not meet the requirements to submit reports",
        reason: "Low credibility score",
        requirements: {
          completedOrders: "Complete at least 3 orders",
          verifyAccount: "Verify your email",
          maintainGoodStanding: "Maintain a good account standing",
        },
      });
    }

    // Warn if reporter has high fraud score
    if (reporterFraudScore >= 50) {
      return res.status(403).json({
        error: "Your account is flagged and cannot submit reports at this time",
        reason: "Account under review for suspicious activity",
      });
    }

    // Count similar reports against this seller
    const similarReports = await Report.countDocuments({
      reportedUser: reportedUserId,
      category,
      status: { $in: ["accepted", "under_review"] },
    });

    // Create report
    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      order: orderId,
      category,
      severity,
      description,
      evidence: finalEvidence,
      reporterCredibility: {
        ...reporterCredibility,
        credibilityScore,
      },
      status: credibilityScore >= 70 ? "under_review" : "pending",
      priority:
        severity === "critical" || similarReports >= 3
          ? "urgent"
          : severity === "high" || similarReports >= 2
          ? "high"
          : "medium",
      impact: {
        similarReports,
      },
    });

    await report.populate("reportedUser", "name email username");
    await report.populate("order", "price status");

    // Auto-flag seller if multiple critical reports or high credibility report
    if (
      (credibilityScore >= 80 && severity === "critical") ||
      similarReports >= 3
    ) {
      // Trigger seller fraud analysis
      await analyzeSellerForFraud(reportedUserId, {
        reportId: report._id,
        category,
        severity,
        credibilityScore,
        similarReports: similarReports + 1,
      });
    }

    res.status(201).json({
      message: "Report submitted successfully",
      report,
      credibilityScore,
      priority: report.priority,
      uploadedScreenshots: screenshotUrls.length,
    });
  } catch (error: any) {
    console.error("Error submitting report:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all reports (Admin)
export const getAllReports = async (req: Request, res: Response) => {
  try {
    const {
      status,
      priority,
      category,
      reportedUserId,
      minCredibility,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (reportedUserId) filter.reportedUser = reportedUserId;
    if (minCredibility)
      filter["reporterCredibility.credibilityScore"] = {
        $gte: Number(minCredibility),
      };

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find(filter)
      .populate("reporter", "name email username")
      .populate("reportedUser", "name email username")
      .populate("order", "price status")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Report.countDocuments(filter);

    res.json({
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get report details (Admin)
export const getReportDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate("reporter", "name email username createdAt verifiedEmail")
      .populate("reportedUser", "name email username createdAt")
      .populate("order")
      .populate("review.reviewedBy", "name email")
      .populate("impact.fraudCaseCreated");

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report });
  } catch (error: any) {
    console.error("Error fetching report details:", error);
    res.status(500).json({ error: error.message });
  }
};

// Review a report (Admin)
export const reviewReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes, actionTaken } = req.body;
    const adminId = req.user?._id;

    if (!adminId) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Update review
    report.review.reviewedBy = adminId as any;
    report.review.reviewedAt = new Date();
    report.review.decision = decision;
    report.review.notes = notes || report.review.notes;

    if (actionTaken) {
      report.review.actionTaken = {
        type: actionTaken.type,
        appliedAt: new Date(),
        details: actionTaken.details || "",
      };
    }

    // Update status
    if (decision === "valid") {
      report.status = "accepted";
      
      // Flag seller if action was taken
      if (actionTaken?.type === "seller_flagged" || actionTaken?.type === "seller_suspended") {
        const fraudCase = await analyzeSellerForFraud(report.reportedUser, {
          reportId: report._id,
          category: report.category,
          severity: report.severity,
          credibilityScore: report.reporterCredibility.credibilityScore,
          similarReports: report.impact.similarReports || 0,
        });
        
        if (fraudCase) {
          report.impact.fraudCaseCreated = fraudCase._id as any;
        }
      }
    } else if (decision === "invalid") {
      report.status = "rejected";
    } else if (decision === "needs_investigation") {
      report.status = "under_review";
    }

    await report.save();
    await report.populate("reporter", "name email");
    await report.populate("reportedUser", "name email");

    res.json({
      message: "Report reviewed successfully",
      report,
    });
  } catch (error: any) {
    console.error("Error reviewing report:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get reports by seller (to see seller's report history)
export const getSellerReports = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;

    const reports = await Report.find({ reportedUser: sellerId })
      .populate("reporter", "name username")
      .sort({ createdAt: -1 });

    const stats = {
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      accepted: reports.filter((r) => r.status === "accepted").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
      byCategory: {} as any,
    };

    reports.forEach((r) => {
      stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
    });

    res.json({ reports, stats });
  } catch (error: any) {
    console.error("Error fetching seller reports:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get my reports (Reporter's own reports)
export const getMyReports = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const reports = await Report.find({ reporter: userId })
      .populate("reportedUser", "name username")
      .populate("order", "price status")
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error: any) {
    console.error("Error fetching user reports:", error);
    res.status(500).json({ error: error.message });
  }
};
