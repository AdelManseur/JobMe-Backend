// @ts-nocheck
import groq from "../lib/groq";
import FraudUser from "../models/frauduser.model";
import Order from "../models/order.model";
import SimpleOrder from "../models/simpleorder.model";
import { User } from "../models/user.model";

export interface FraudAnalysisResult {
  isFraudulent: boolean;
  riskScore: number; // 0-100
  reasons: string[];
  recommendation: "approve" | "review" | "reject";
  flags: {
    category: "behavioral" | "transactional" | "account" | "pattern" | "payment";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    evidence: any;
  }[];
  suspiciousPatterns: {
    pattern: string;
    occurrences: number;
    severity: "low" | "medium" | "high";
    examples: any[];
  }[];
}

export async function analyzeOrderForFraud(orderData: {
  userId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  buyerHistory?: {
    totalOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    accountAge: number;
  };
  orderDetails: {
    requirements?: any[];
    deliveryTime: number;
    unusualPatterns?: string[];
  };
  triggeringEvent?: any;
}): Promise<FraudAnalysisResult> {
  const prompt = `You are a fraud detection AI analyzing an e-commerce order. Analyze the following order data and determine if it's potentially fraudulent:

Order Details:
- Price: $${orderData.price}
- Delivery Time: ${orderData.orderDetails.deliveryTime} days
- Buyer Account Age: ${orderData.buyerHistory?.accountAge || "New"} days
- Buyer Total Orders: ${orderData.buyerHistory?.totalOrders || 0}
- Buyer Cancelled Orders: ${orderData.buyerHistory?.cancelledOrders || 0}
- Buyer Average Order Value: $${orderData.buyerHistory?.averageOrderValue || 0}
- Requirements Provided: ${orderData.orderDetails.requirements?.length || 0}
${
  orderData.orderDetails.unusualPatterns?.length
    ? `- Unusual Patterns: ${orderData.orderDetails.unusualPatterns.join(", ")}`
    : ""
}

Analyze for:
1. Unusual price patterns (too high/low compared to history)
2. New account with large order
3. High cancellation rate
4. Suspicious behavior patterns
5. Delivery time mismatches
6. Missing requirements for high-value orders

Return ONLY a JSON response in this exact format (no markdown, no extra text):
{
  "riskScore": <number 0-100>,
  "isFraudulent": <boolean>,
  "reasons": ["reason1", "reason2"],
  "recommendation": "approve|review|reject",
  "flags": [
    {
      "category": "transactional|behavioral|account|pattern|payment",
      "severity": "low|medium|high|critical",
      "description": "specific issue description",
      "evidence": {"key": "value"}
    }
  ],
  "suspiciousPatterns": [
    {
      "pattern": "pattern name",
      "occurrences": 1,
      "severity": "low|medium|high",
      "examples": []
    }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a fraud detection expert. Always respond with valid JSON only, no markdown or extra text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content || "";
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!parsedResponse) {
      throw new Error("Invalid AI response format");
    }

    const result: FraudAnalysisResult = {
      isFraudulent: parsedResponse.isFraudulent || false,
      riskScore: parsedResponse.riskScore || 0,
      reasons: parsedResponse.reasons || [],
      recommendation: parsedResponse.recommendation || "review",
      flags: parsedResponse.flags || [],
      suspiciousPatterns: parsedResponse.suspiciousPatterns || [],
    };

    // Auto-flag user if risk score is high
    if (result.riskScore >= 70) {
      await autoFlagUser(orderData.userId, result, orderData.triggeringEvent);
    }

    return result;
  } catch (error) {
    console.error("Fraud detection error:", error);
    return {
      isFraudulent: false,
      riskScore: 50,
      reasons: ["Error in fraud detection, requires manual review"],
      recommendation: "review",
      flags: [
        {
          category: "pattern",
          severity: "medium",
          description: "AI analysis error - manual review required",
          evidence: { error: String(error) },
        },
      ],
      suspiciousPatterns: [],
    };
  }
}

// Automatically flag a user in the FraudUser collection
async function autoFlagUser(
  userId: string,
  analysisResult: FraudAnalysisResult,
  triggeringEvent: any
) {
  try {
    // Check if user already has an active fraud case
    const existingCase = await FraudUser.findOne({
      user: userId,
      resolved: false,
      status: { $ne: "false_positive" },
    });

    if (existingCase) {
      // Update existing case with new information
      existingCase.fraudScore = Math.max(
        existingCase.fraudScore,
        analysisResult.riskScore
      );
      existingCase.flags.push(...analysisResult.flags);
      existingCase.suspiciousPatterns.push(...analysisResult.suspiciousPatterns);
      existingCase.lastCheckedAt = new Date();
      await existingCase.save();
      return existingCase;
    }

    // Gather user data
    const user = await User.findById(userId);
    if (!user) return;

    const allOrders = await Order.find({ buyer: userId });
    const simpleOrders = await SimpleOrder.find({ buyer: userId });
    const totalOrders = [...allOrders, ...simpleOrders];

    const accountAge = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Create new fraud case
    const fraudCase = await FraudUser.create({
      user: userId,
      fraudScore: analysisResult.riskScore,
      status:
        analysisResult.riskScore >= 85
          ? "confirmed_fraud"
          : "pending_review",
      aiAnalysis: {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        confidence: analysisResult.riskScore,
        detectedAt: new Date(),
        analysisVersion: "1.0",
      },
      flags: analysisResult.flags,
      triggeringEvent: triggeringEvent || {
        type: "other",
        details: analysisResult.reasons,
        timestamp: new Date(),
      },
      userSnapshot: {
        accountAge,
        totalOrders: totalOrders.length,
        cancelledOrders: totalOrders.filter((o) => o.status === "cancelled")
          .length,
        completedOrders: totalOrders.filter((o) => o.status === "completed")
          .length,
        averageOrderValue:
          totalOrders.reduce((sum, o) => sum + o.price, 0) /
            totalOrders.length || 0,
        totalSpent: totalOrders.reduce((sum, o) => sum + o.price, 0),
        totalEarned: 0,
        verificationStatus: {
          email: user.verifiedEmail || false,
          phone: user.verifiedPhone || false,
          identity: user.verifiedIdentity || false,
        },
        recentActivity: {
          ordersLast24h: totalOrders.filter(
            (o) => new Date(o.createdAt) > last24h
          ).length,
          ordersLast7days: totalOrders.filter(
            (o) => new Date(o.createdAt) > last7days
          ).length,
          messagesLast24h: 0,
          loginLocations: [],
          deviceInfo: [],
        },
      },
      suspiciousPatterns: analysisResult.suspiciousPatterns,
      riskAssessment: {
        immediateRisk: analysisResult.riskScore >= 85,
        potentialLoss: 0,
        affectedUsers: 0,
        recommendedAction:
          analysisResult.riskScore >= 85
            ? "immediate_suspension"
            : analysisResult.riskScore >= 70
            ? "monitor_closely"
            : "manual_review",
      },
    });

    console.log(
      `User ${userId} auto-flagged for fraud (score: ${analysisResult.riskScore})`
    );
    return fraudCase;
  } catch (error) {
    console.error("Error auto-flagging user:", error);
  }
}

// Pattern-based fraud detection
export async function detectSuspiciousPatterns(
  userId: string,
  orders: any[]
): Promise<string[]> {
  const patterns: string[] = [];

  if (orders.length === 0) return patterns;

  // Multiple orders in short time
  const recentOrders = orders.filter(
    (o) =>
      new Date(o.createdAt) > new Date(Date.now() - 3600000) // Last hour
  );
  if (recentOrders.length >= 3) {
    patterns.push("Multiple orders in short timeframe");
  }

  // Unusual pricing patterns
  const prices = orders.map((o) => o.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const lastPrice = prices[prices.length - 1];
  if (lastPrice > avgPrice * 5) {
    patterns.push("Order value significantly higher than average");
  }

  // High cancellation rate
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
  if (cancelledCount / orders.length > 0.5 && orders.length >= 3) {
    patterns.push("High cancellation rate");
  }

  return patterns;
}

// Analyze seller for fraud based on reports
export async function analyzeSellerForFraud(
  sellerId: string | any,
  reportData: {
    reportId: any;
    category: string;
    severity: string;
    credibilityScore: number;
    similarReports: number;
  }
): Promise<any> {
  try {
    const Report = (await import("../models/report.model")).default;
    
    // Get all reports against this seller
    const allReports = await Report.find({
      reportedUser: sellerId,
      status: { $in: ["accepted", "under_review"] },
    }).populate("reporter", "name");

    // Get seller's order history
    const sellerOrders = [
      ...(await Order.find({ seller: sellerId })),
      ...(await SimpleOrder.find({ seller: sellerId })),
    ];

    const seller = await User.findById(sellerId);
    if (!seller) return null;

    const accountAge = Math.floor(
      (Date.now() - seller.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate fraud risk based on reports
    let fraudScore = 0;
    const flags: any[] = [];
    const reasons: string[] = [];

    // Factor 1: Number of reports
    if (allReports.length >= 5) {
      fraudScore += 30;
      flags.push({
        category: "pattern",
        severity: "high",
        description: `${allReports.length} reports filed against seller`,
        evidence: { reportCount: allReports.length },
      });
      reasons.push(`Multiple reports (${allReports.length}) from different buyers`);
    } else if (allReports.length >= 3) {
      fraudScore += 20;
    }

    // Factor 2: Credibility of reporters
    const highCredibilityReports = allReports.filter(
      (r) => r.reporterCredibility.credibilityScore >= 70
    );
    if (highCredibilityReports.length >= 2) {
      fraudScore += 25;
      flags.push({
        category: "behavioral",
        severity: "high",
        description: "Multiple reports from highly credible buyers",
        evidence: { count: highCredibilityReports.length },
      });
      reasons.push("Reports from trusted, verified buyers");
    }

    // Factor 3: Critical severity reports
    const criticalReports = allReports.filter(
      (r) => r.severity === "critical" || r.severity === "high"
    );
    if (criticalReports.length >= 2) {
      fraudScore += 20;
      flags.push({
        category: "transactional",
        severity: "critical",
        description: "Multiple critical/high severity reports",
        evidence: { count: criticalReports.length },
      });
      reasons.push("Multiple serious violations reported");
    }

    // Factor 4: Report categories (scam, non-delivery are serious)
    const seriousCategories = allReports.filter((r) =>
      ["scam", "non_delivery", "fake_service"].includes(r.category)
    );
    if (seriousCategories.length >= 2) {
      fraudScore += 25;
      flags.push({
        category: "transactional",
        severity: "critical",
        description: "Reports indicate potential scam activity",
        evidence: { categories: seriousCategories.map((r) => r.category) },
      });
      reasons.push("Pattern of non-delivery or scam behavior");
    }

    // Factor 5: Order completion rate
    const completedOrders = sellerOrders.filter(
      (o) => o.status === "completed"
    ).length;
    const cancelledOrders = sellerOrders.filter(
      (o) => o.status === "cancelled"
    ).length;
    
    if (sellerOrders.length > 0) {
      const completionRate = completedOrders / sellerOrders.length;
      if (completionRate < 0.5) {
        fraudScore += 15;
        flags.push({
          category: "pattern",
          severity: "medium",
          description: "Low order completion rate",
          evidence: { completionRate: (completionRate * 100).toFixed(1) + "%" },
        });
        reasons.push("Low completion rate on orders");
      }
    }

    // Only create fraud case if score is significant
    if (fraudScore < 50) {
      return null;
    }

    // Check for existing fraud case
    const existingCase = await FraudUser.findOne({
      user: sellerId,
      resolved: false,
    });

    if (existingCase) {
      // Update existing case
      existingCase.fraudScore = Math.max(existingCase.fraudScore, fraudScore);
      existingCase.flags.push(...flags);
      existingCase.lastCheckedAt = new Date();
      await existingCase.save();
      return existingCase;
    }

    // Create new fraud case
    const fraudCase = await FraudUser.create({
      user: sellerId,
      fraudScore,
      status: fraudScore >= 80 ? "confirmed_fraud" : "pending_review",
      aiAnalysis: {
        model: "report-based-analysis",
        confidence: reportData.credibilityScore,
        detectedAt: new Date(),
        analysisVersion: "1.0",
      },
      flags,
      triggeringEvent: {
        type: "other",
        referenceId: reportData.reportId,
        details: {
          source: "buyer_reports",
          reportCategory: reportData.category,
          reportSeverity: reportData.severity,
        },
        timestamp: new Date(),
      },
      userSnapshot: {
        accountAge,
        totalOrders: sellerOrders.length,
        cancelledOrders,
        completedOrders,
        averageOrderValue:
          sellerOrders.reduce((sum, o) => sum + o.price, 0) /
            sellerOrders.length || 0,
        totalSpent: 0,
        totalEarned: sellerOrders.reduce((sum, o) => sum + o.price, 0),
        verificationStatus: {
          email: seller.verifiedEmail || false,
          phone: seller.verifiedPhone || false,
          identity: seller.verifiedIdentity || false,
        },
        recentActivity: {
          ordersLast24h: 0,
          ordersLast7days: 0,
          messagesLast24h: 0,
          loginLocations: [],
          deviceInfo: [],
        },
      },
      suspiciousPatterns: [
        {
          pattern: "Multiple buyer reports",
          occurrences: allReports.length,
          severity: allReports.length >= 5 ? "high" : "medium",
          examples: allReports.slice(0, 3).map((r) => ({
            reportId: r._id,
            category: r.category,
            reporter: r.reporter,
          })),
        },
      ],
      riskAssessment: {
        immediateRisk: fraudScore >= 80,
        potentialLoss: 0,
        affectedUsers: allReports.length,
        recommendedAction:
          fraudScore >= 80
            ? "immediate_suspension"
            : fraudScore >= 65
            ? "monitor_closely"
            : "manual_review",
      },
    });

    console.log(
      `Seller ${sellerId} flagged for fraud based on reports (score: ${fraudScore})`
    );
    return fraudCase;
  } catch (error) {
    console.error("Error analyzing seller for fraud:", error);
    return null;
  }
}
