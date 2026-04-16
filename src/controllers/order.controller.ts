import { Request, Response, NextFunction } from "express";
import { Order, IOrder } from "../models/order.model";
import { Gig } from "../models/gig.model";
import { OrderMessage } from "../models/ordermessage.model";
import mongoose from "mongoose";

// Create new order
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const buyerId = req.user?._id;
    if (!buyerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      gigId,
      package: packageType,
      requirements,
      extras
    } = req.body;

    if (!gigId || !packageType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate gig exists and is active
    const gig = await Gig.findById(gigId).populate('seller', 'name email');
    if (!gig || !gig.isActive) {
      return res.status(404).json({ message: "Gig not found or inactive" });
    }

    // Check if buyer is not the seller
    if (gig.seller._id.toString() === buyerId.toString()) {
      return res.status(400).json({ message: "Cannot order your own gig" });
    }

    // Get package details
    const packageDetails = gig.price[packageType as 'basic' | 'standard' | 'premium'];
    if (!packageDetails) {
      return res.status(400).json({ message: "Invalid package type" });
    }

    // Calculate total amount
    const extrasTotal = extras?.reduce((sum: number, extra: any) => sum + extra.price, 0) || 0;
    const totalAmount = packageDetails.price + extrasTotal;

    // Create order
    const newOrder = new Order({
      gig: gigId,
      buyer: buyerId,
      seller: gig.seller._id,
      package: packageType,
      price: packageDetails.price,
      deliveryTime: packageDetails.deliveryTime,
      revisions: packageDetails.revisions,
      requirements: requirements || [],
      extras: extras || [],
      totalAmount,
      payment: {
        amount: totalAmount,
        currency: 'USD',
        status: 'pending'
      }
    });

    const savedOrder = await newOrder.save();
    await savedOrder.populate([
      { path: 'gig', select: 'title images price' },
      { path: 'buyer', select: 'name email pfp' },
      { path: 'seller', select: 'name email pfp' }
    ]);

    // Update gig total orders count
    await Gig.findByIdAndUpdate(gigId, { $inc: { totalOrders: 1 } });

    res.status(201).json({
      message: "Order created successfully",
      order: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

// Get orders for buyer
export const getBuyerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const buyerId = req.user?._id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter: any = { buyer: buyerId };
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(20, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate('gig', 'title images price category')
        .populate('seller', 'name pfp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get orders for seller
export const getSellerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sellerId = req.user?._id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter: any = { seller: sellerId };
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(20, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate('gig', 'title images price category')
        .populate('buyer', 'name pfp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single order
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId)
      .populate('gig', 'title images price category seller')
      .populate('buyer', 'name email pfp')
      .populate('seller', 'name email pfp');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is involved in this order
    if (order.buyer._id.toString() !== userId?.toString() && 
        order.seller._id.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

// Update order status
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const validStatuses = ['pending', 'active', 'delivered', 'completed', 'cancelled', 'in_revision'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization based on status change
    const isSeller = order.seller.toString() === userId?.toString();
    const isBuyer = order.buyer.toString() === userId?.toString();

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Status transition rules
    const statusTransitions: { [key: string]: string[] } = {
      'pending': ['active', 'cancelled'],
      'active': ['delivered', 'cancelled'],
      'delivered': ['completed', 'in_revision'],
      'in_revision': ['delivered'],
      'completed': [],
      'cancelled': []
    };

    if (!statusTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ message: "Invalid status transition" });
    }

    // Update timeline
    const timeline = { ...order.timeline };
    switch (status) {
      case 'active':
        timeline.started = new Date();
        break;
      case 'delivered':
        timeline.delivered = new Date();
        break;
      case 'completed':
        timeline.completed = new Date();
        break;
      case 'cancelled':
        timeline.cancelled = new Date();
        break;
    }

    order.status = status;
    order.timeline = timeline;
    await order.save();

    res.status(200).json({
      message: `Order status updated to ${status}`,
      order: order
    });
  } catch (error) {
    next(error);
  }
};

// Add deliverable to order
export const addDeliverable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { files, description } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only seller can add deliverables
    if (order.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Only seller can add deliverables" });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ message: "Order must be active to add deliverables" });
    }

    const deliverable = {
      files: files || [],
      description,
      deliveredAt: new Date()
    };

    order.deliverables.push(deliverable);
    await order.save();

    res.status(200).json({
      message: "Deliverable added successfully",
      deliverable
    });
  } catch (error) {
    next(error);
  }
};

// Request revision
export const requestRevision = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { description } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only buyer can request revisions
    if (order.buyer.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Only buyer can request revisions" });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: "Order must be delivered to request revision" });
    }

    // Check if revisions are available
    const usedRevisions = order.revisionRequests.filter(r => r.status === 'approved').length;
    if (usedRevisions >= order.revisions) {
      return res.status(400).json({ message: "No revisions remaining" });
    }

    const revisionRequest = {
      description,
      requestedAt: new Date(),
      status: 'pending' as const
    };

    order.revisionRequests.push(revisionRequest);
    await order.save();

    res.status(200).json({
      message: "Revision requested successfully",
      revisionRequest
    });
  } catch (error) {
    next(error);
  }
};

// Add message to order conversation
export const addMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { message, attachments } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    /*const order = await Order.findById(orderId);*/
    //By Me
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is involved in this order
    if (order.buyer.toString() !== userId?.toString() && 
        order.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Determine the recipient
    const toUserId = order.buyer.toString() === userId?.toString() 
      ? order.seller 
      : order.buyer;

    // Create new order message
    const orderMessage = new OrderMessage({
      orderId: orderId,
      from: userId,
      to: toUserId,
      message,
      attachments: attachments || [],
      timestamp: new Date()
    });

    const savedMessage = await orderMessage.save();
    await savedMessage.populate([
      { path: 'from', select: 'name pfp' },
      { path: 'to', select: 'name pfp' }
    ]);

    res.status(200).json({
      message: "Message added successfully",
      data: savedMessage
    });
  } catch (error) {
    next(error);
  }
};

// Add review to completed order
export const addReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("OOOOOOOOOOOOOOOOOO"); // DEBUG
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only buyer can add reviews
    if (order.buyer.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Only buyer can add reviews" });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ message: "Order must be completed to add review" });
    }

    if (order.review) {
      return res.status(400).json({ message: "Review already exists" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    order.review = {
      rating,
      comment,
      reviewedAt: new Date()
    };

    await order.save();

    // Update gig rating
    const gig = await Gig.findById(order.gig);
    if (gig) {
      const newCount = gig.rating.count + 1;
      const newAverage = ((gig.rating.average * gig.rating.count) + rating) / newCount;
      
      gig.rating.average = Math.round(newAverage * 10) / 10; // Round to 1 decimal
      gig.rating.count = newCount;
      await gig.save();
    }

    res.status(200).json({
      message: "Review added successfully",
      review: order.review
    });
  } catch (error) {
    next(error);
  }
};

// Get order messages/conversation
export const getOrderMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("OOOOOOOOOOOOOOOOOO");
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is involved in this order
    if (order.buyer.toString() !== userId?.toString() && 
        order.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [messages, totalCount] = await Promise.all([
      OrderMessage.find({ orderId })
        .populate('from', 'name pfp')
        .populate('to', 'name pfp')
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OrderMessage.countDocuments({ orderId })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      messages,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is involved in this order
    const isSeller = order.seller.toString() === userId?.toString();
    const isBuyer = order.buyer.toString() === userId?.toString();

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Can only cancel pending or active orders
    if (!['pending', 'active'].includes(order.status)) {
      return res.status(400).json({ message: "Cannot cancel order in current status" });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.timeline.cancelled = new Date();

    // Update payment status if applicable
    if (order.payment.status === 'paid') {
      order.payment.status = 'refunded';
    }

    await order.save();

    res.status(200).json({
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};