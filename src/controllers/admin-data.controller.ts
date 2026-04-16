//@ts-nocheck
import { Request, Response } from "express";
import { User } from "../models/user.model";
import Order from "../models/order.model";
import SimpleOrder from "../models/simpleorder.model";
import FraudUser from "../models/frauduser.model";
import Report from "../models/report.model";

// Get Dashboard Statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalOrders,
      totalFraudCases,
      totalReports,
      activeFraudCases,
      pendingReports,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      FraudUser.countDocuments(),
      Report.countDocuments(),
      FraudUser.countDocuments({ resolved: false }),
      Report.countDocuments({ status: "pending" }),
    ]);

    // Get recent activity (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [newUsers24h, newOrders24h, newFraudCases24h, newReports24h] =
      await Promise.all([
        User.countDocuments({ createdAt: { $gte: last24h } }),
        Order.countDocuments({ createdAt: { $gte: last24h } }),
        FraudUser.countDocuments({ createdAt: { $gte: last24h } }),
        Report.countDocuments({ createdAt: { $gte: last24h } }),
      ]);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          new24h: newUsers24h,
        },
        orders: {
          total: totalOrders,
          new24h: newOrders24h,
        },
        fraud: {
          total: totalFraudCases,
          active: activeFraudCases,
          new24h: newFraudCases24h,
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
          new24h: newReports24h,
        },
      },
    });
  } catch (error: any) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get All Users with Filters
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== undefined) {
      filter.status = status === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get User Details
export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's orders
    const orders = await Order.find({
      $or: [{ buyer: userId }, { seller: userId }],
    }).limit(10);

    // Get user's fraud cases
    const fraudCases = await FraudUser.find({ user: userId });

    // Get reports by user
    const reportsBy = await Report.find({ reporter: userId });

    // Get reports against user
    const reportsAgainst = await Report.find({ reportedUser: userId });

    res.json({
      user,
      orders: orders.length,
      fraudCases: fraudCases.length,
      reportsBy: reportsBy.length,
      reportsAgainst: reportsAgainst.length,
    });
  } catch (error: any) {
    console.error("Get user details error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Suspend/Activate User
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    /*if (!req.user?.permissions?.canManageUsers) {
      return res
        .status(403)
        .json({ error: "You don't have permission to manage users" });
    }*/

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = status;
    await user.save();

    res.json({
      message: `User ${status ? "activated" : "suspended"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error("Update user status error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get All Orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { status, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (minPrice) filter.price = { $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(filter)
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get all orders error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Search Across Platform
export const searchPlatform = async (req: Request, res: Response) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchRegex = { $regex: query, $options: "i" };
    const results: any = {};

    // Search users
    if (!type || type === "users") {
      results.users = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("name email status createdAt")
        .limit(10);
    }

    // Search fraud cases
    if (!type || type === "fraud") {
      results.fraudCases = await FraudUser.find()
        .populate("user", "name email")
        .limit(10);
    }

    // Search reports
    if (!type || type === "reports") {
      results.reports = await Report.find()
        .populate("reporter", "name email")
        .populate("reportedUser", "name email")
        .limit(10);
    }

    res.json({ results });
  } catch (error: any) {
    console.error("Search platform error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Analytics Data
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "7days" } = req.query;

    let startDate: Date;
    switch (period) {
      case "24h":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "7days":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // User growth
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Order trends
    const orderTrends = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: "$price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fraud trends
    const fraudTrends = await FraudUser.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          avgScore: { $avg: "$fraudScore" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      period,
      analytics: {
        userGrowth,
        orderTrends,
        fraudTrends,
      },
    });
  } catch (error: any) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};
