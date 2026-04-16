import { Request, Response } from "express";
import FraudUser from "../models/frauduser.model";
import Order from "../models/order.model";
import SimpleOrder from "../models/simpleorder.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";

// AI flags a user as fraudulent
export const flagUserAsFraud = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      fraudScore,
      flags,
      triggeringEvent,
      suspiciousPatterns,
      aiAnalysis,
      riskAssessment,
    } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Gather user snapshot data
    const allOrders = await Order.find({ buyer: userId });
    const simpleOrders = await SimpleOrder.find({ buyer: userId });
    const totalOrders = [...allOrders, ...simpleOrders];

    const accountAge = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userSnapshot = {
      accountAge,
      totalOrders: totalOrders.length,
      cancelledOrders: totalOrders.filter((o) => o.status === "cancelled").length,
      completedOrders: totalOrders.filter((o) => o.status === "completed").length,
      averageOrderValue:
        totalOrders.reduce((sum, o) => sum + o.price, 0) / totalOrders.length || 0,
      totalSpent: totalOrders.reduce((sum, o) => sum + o.price, 0),
      totalEarned: 0, // Calculate from seller orders if needed
      verificationStatus: {
        email: (user as any).verifiedEmail || false,
        phone: (user as any).verifiedPhone || false,
        identity: (user as any).verifiedIdentity || false,
      },
      recentActivity: {
        ordersLast24h: totalOrders.filter(
          (o) => new Date(o.createdAt) > last24h
        ).length,
        ordersLast7days: totalOrders.filter(
          (o) => new Date(o.createdAt) > last7days
        ).length,
        messagesLast24h: 0, // Can be calculated from message model
        loginLocations: [], // If you track this
        deviceInfo: [], // If you track this
      },
    };

    // Check for prior flags
    const priorFlags = await FraudUser.find({ user: userId }).select(
      "createdAt fraudScore resolved resolution"
    );

    const priorFlagsData = priorFlags.map((flag) => ({
      flaggedAt: flag.createdAt,
      reason: `Fraud score: ${flag.fraudScore}`,
      resolved: flag.resolved,
      resolution: flag.resolution?.outcome || "",
    }));

    // Create fraud user record
    const fraudUser = await FraudUser.create({
      user: userId,
      fraudScore,
      status: fraudScore >= 80 ? "confirmed_fraud" : "pending_review",
      aiAnalysis: {
        model: aiAnalysis?.model || "meta-llama/llama-4-maverick-17b-128e-instruct",
        confidence: aiAnalysis?.confidence || fraudScore,
        detectedAt: new Date(),
        analysisVersion: aiAnalysis?.version || "1.0",
      },
      flags: flags || [],
      triggeringEvent,
      userSnapshot,
      suspiciousPatterns: suspiciousPatterns || [],
      priorFlags: priorFlagsData,
      riskAssessment: riskAssessment || {
        immediateRisk: fraudScore >= 80,
        potentialLoss: 0,
        affectedUsers: 0,
        recommendedAction:
          fraudScore >= 80
            ? "immediate_suspension"
            : fraudScore >= 60
            ? "monitor_closely"
            : "manual_review",
      },
      review: {
        decision: "pending",
        notes: "",
      },
    });

    // Populate user details
    await fraudUser.populate("user", "name email username");

    res.status(201).json({
      message: "User flagged for fraud review",
      fraudUser,
    });
  } catch (error: any) {
    console.error("Error flagging user:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all flagged users (with filters)
export const getFlaggedUsers = async (req: Request, res: Response) => {
  try {
    const {
      status,
      minScore,
      maxScore,
      resolved,
      immediateRisk,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (minScore) filter.fraudScore = { $gte: Number(minScore) };
    if (maxScore) filter.fraudScore = { ...filter.fraudScore, $lte: Number(maxScore) };
    if (resolved !== undefined) filter.resolved = resolved === "true";
    if (immediateRisk !== undefined)
      filter["riskAssessment.immediateRisk"] = immediateRisk === "true";

    const skip = (Number(page) - 1) * Number(limit);

    const fraudUsers = await FraudUser.find(filter)
      .populate("user", "name email username createdAt")
      .populate("review.reviewedBy", "name email")
      .sort({ fraudScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await FraudUser.countDocuments(filter);

    res.json({
      fraudUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching flagged users:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get single fraud case details
export const getFraudCaseDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fraudCase = await FraudUser.findById(id)
      .populate("user", "name email username createdAt verifiedEmail verifiedPhone")
      .populate("review.reviewedBy", "name email")
      .populate("review.actionTaken.appliedBy", "name email")
      .populate("resolution.resolvedBy", "name email")
      .populate("relatedCases");

    if (!fraudCase) {
      return res.status(404).json({ error: "Fraud case not found" });
    }

    res.json({ fraudCase });
  } catch (error: any) {
    console.error("Error fetching fraud case:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Review a fraud case
export const reviewFraudCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes, actionTaken } = req.body;
    const adminId = req.user?._id; // Assuming auth middleware sets req.user

    if (!adminId) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    const fraudCase = await FraudUser.findById(id);
    if (!fraudCase) {
      return res.status(404).json({ error: "Fraud case not found" });
    }

    // Update review information
    fraudCase.review.reviewedBy = adminId as any;
    fraudCase.review.reviewedAt = new Date();
    fraudCase.review.decision = decision;
    fraudCase.review.notes = notes || fraudCase.review.notes;

    if (actionTaken) {
      fraudCase.review.actionTaken = {
        type: actionTaken.type,
        appliedAt: new Date(),
        appliedBy: adminId as any,
        details: actionTaken.details || "",
      };
    }

    // Update status based on decision
    if (decision === "confirmed") {
      fraudCase.status = "confirmed_fraud";
    } else if (decision === "dismissed") {
      fraudCase.status = "false_positive";
      fraudCase.resolved = true;
      fraudCase.resolvedAt = new Date();
      fraudCase.resolution = {
        outcome: "false_alarm",
        details: notes || "Dismissed by admin review",
        resolvedBy: adminId as any,
      };
    }

    fraudCase.lastCheckedAt = new Date();
    await fraudCase.save();

    await fraudCase.populate("user", "name email username");
    await fraudCase.populate("review.reviewedBy", "name email");

    res.json({
      message: "Fraud case reviewed successfully",
      fraudCase,
    });
  } catch (error: any) {
    console.error("Error reviewing fraud case:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Resolve a fraud case
export const resolveFraudCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { outcome, details } = req.body;
    const adminId = req.user?._id;

    if (!adminId) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    const fraudCase = await FraudUser.findById(id);
    if (!fraudCase) {
      return res.status(404).json({ error: "Fraud case not found" });
    }

    fraudCase.resolved = true;
    fraudCase.resolvedAt = new Date();
    fraudCase.resolution = {
      outcome,
      details,
      resolvedBy: adminId as any,
    };
    fraudCase.lastCheckedAt = new Date();

    await fraudCase.save();
    await fraudCase.populate("user", "name email username");

    res.json({
      message: "Fraud case resolved successfully",
      fraudCase,
    });
  } catch (error: any) {
    console.error("Error resolving fraud case:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get fraud statistics/dashboard data
export const getFraudStatistics = async (req: Request, res: Response) => {
  try {
    const totalCases = await FraudUser.countDocuments();
    const pendingReview = await FraudUser.countDocuments({
      status: "pending_review",
    });
    const confirmedFraud = await FraudUser.countDocuments({
      status: "confirmed_fraud",
    });
    const falsePositives = await FraudUser.countDocuments({
      status: "false_positive",
    });
    const immediateRiskCases = await FraudUser.countDocuments({
      "riskAssessment.immediateRisk": true,
      resolved: false,
    });

    // Average fraud score
    const avgScoreResult = await FraudUser.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$fraudScore" } } },
    ]);
    const averageFraudScore = avgScoreResult[0]?.avgScore || 0;

    // Recent cases (last 7 days)
    const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCases = await FraudUser.countDocuments({
      createdAt: { $gte: last7days },
    });

    // Top flagged categories
    const topCategories = await FraudUser.aggregate([
      { $unwind: "$flags" },
      { $group: { _id: "$flags.category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      statistics: {
        totalCases,
        pendingReview,
        confirmedFraud,
        falsePositives,
        immediateRiskCases,
        averageFraudScore: Math.round(averageFraudScore * 10) / 10,
        recentCases,
        topCategories,
      },
    });
  } catch (error: any) {
    console.error("Error fetching fraud statistics:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get user's fraud history (for checking before allowing transactions)
export const checkUserFraudStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const fraudRecords = await FraudUser.find({ user: userId }).sort({
      createdAt: -1,
    });

    const activeFraudCase = fraudRecords.find(
      (record) => !record.resolved && record.status !== "false_positive"
    );

    const isFlagged = !!activeFraudCase;
    const highestScore = Math.max(...fraudRecords.map((r) => r.fraudScore), 0);

    res.json({
      isFlagged,
      activeFraudCase,
      highestScore,
      totalFlags: fraudRecords.length,
      fraudHistory: fraudRecords,
      recommendation: isFlagged
        ? activeFraudCase.riskAssessment.recommendedAction
        : "no_action",
    });
  } catch (error: any) {
    console.error("Error checking user fraud status:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add notes to a fraud case
export const addNoteToFraudCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const adminId = req.user?._id;

    const fraudCase = await FraudUser.findById(id);
    if (!fraudCase) {
      return res.status(404).json({ error: "Fraud case not found" });
    }

    fraudCase.review.notes = fraudCase.review.notes
      ? `${fraudCase.review.notes}\n\n[${new Date().toISOString()}] ${note}`
      : note;

    fraudCase.lastCheckedAt = new Date();
    await fraudCase.save();

    res.json({
      message: "Note added successfully",
      fraudCase,
    });
  } catch (error: any) {
    console.error("Error adding note:", error);
    res.status(500).json({ error: error.message });
  }
};
