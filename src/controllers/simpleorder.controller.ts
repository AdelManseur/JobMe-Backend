import { Request, Response, NextFunction } from "express";
import { SimpleOrder } from "../models/simpleorder.model";
import { SimpleGig } from "../models/simplegig.model";
import mongoose from "mongoose";
import { SimpleOrderMessage } from "../models/simpleordermessage.model";
import { access } from "fs";

// Create new simple order
export const createSimpleOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const buyerId = req.user?._id;
    if (!buyerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("[createSimpleOrder] Request body:", req.body);

    const {
      gigId,
      requirements
    } = req.body;

    if (!gigId) {
      return res.status(400).json({ message: "Gig ID is required" });
    }

    const gig = await SimpleGig.findById(gigId).populate('seller', 'name email');
    if (!gig || !gig.isActive) {
      return res.status(404).json({ message: "Gig not found or inactive" });
    }

    if (gig.seller._id.toString() === buyerId.toString()) {
      return res.status(400).json({ message: "Cannot order your own gig" });
    }

    const now = new Date();
    const expectedDelivery = new Date(now);
    expectedDelivery.setDate(expectedDelivery.getDate() + Number(gig.deliveryTime || 1));

    const newOrder = new SimpleOrder({
      gig: gigId,
      buyer: buyerId,
      seller: gig.seller._id,
      price: gig.price,
      deliveryTime: gig.deliveryTime,
      revisions: gig.revisions,
      expectedDelivery,
      requirements: requirements || [],
      status: 'pending',
      payment: {
        amount: gig.price,
        currency: 'USD',
        status: 'pending'
      },
      timeline: {
        started: now
      }
    });

    const savedOrder = await newOrder.save();
    await savedOrder.populate([
      { path: 'gig', select: 'title images price' },
      { path: 'buyer', select: 'name email pfp' },
      { path: 'seller', select: 'name email pfp' }
    ]);

    await SimpleGig.findByIdAndUpdate(gigId, { $inc: { totalOrders: 1 } });

    res.status(201).json({
      message: "Order created successfully",
      order: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

// Get orders for buyer
export const getSimpleBuyerOrders = async (
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
      SimpleOrder.find(filter)
        .populate('gig', 'title images price category')
        .populate('seller', 'name pfp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SimpleOrder.countDocuments(filter)
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
export const getSimpleSellerOrders = async (
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
      SimpleOrder.find(filter)
        .populate('gig', 'title images price category')
        .populate('buyer', 'name pfp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SimpleOrder.countDocuments(filter)
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

// Get single simple order
// Modified by Me
export const getSimpleOrderById = async (
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

    const order = await SimpleOrder.findById(orderId)
      .populate('gig', 'title images price category seller')
      .populate('buyer', 'name email pfp')
      .populate('seller', 'name email pfp');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // By Me
    // Check if the user created the Gig associated with this order
    const gig = await SimpleGig.findById(order.gig)
      /*.populate('gig', 'title images price category seller')*/
      /*.populate('buyer', 'name email pfp')*/
      /*.populate('seller', 'name email pfp');*/

    if (!gig) {
      return res.status(404).json({ message: "Associated gig not found" });
    }

    if (gig.seller._id.toString() == userId?.toString()) {
      order.accessLevel = "seller";
      res.status(200).json({ order });
    } else if (order.buyer._id.toString() == userId?.toString()) {
      order.accessLevel = "buyer";
      res.status(200).json({ order });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

  } catch (error) {
    next(error);
  }
};

//Added by Me
export const getSimpleOrderByTwoUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { me, other } = req.query;
    //const userId = req.user?._id;

    const orders = await SimpleOrder.find({
      $or: [
        { seller: me, buyer: other },
        { seller: other, buyer: me }
      ]
    }).populate('gig', 'title images price category seller')
      .populate('buyer', 'name email pfp')
      .populate('seller', 'name email pfp');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const ordersToSell = orders.filter(order => order.seller._id.toString() === me);
    const ordersToBuy = orders.filter(order => order.buyer._id.toString() === me);

    return res.status(200).json({ orders: [ordersToSell, ordersToBuy] });

  } catch (error) {
    next(error);
  }
};

// Update simple order status
export const updateSimpleOrderStatus = async (
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

    const order = await SimpleOrder.findById(orderId);
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

// Add deliverable to simple order
export const addSimpleDeliverable = async (
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

    const order = await SimpleOrder.findById(orderId);
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

// Request revision for simple order
export const requestSimpleRevision = async (
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

    const order = await SimpleOrder.findById(orderId);
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

// Add review to completed simple order
export const addSimpleReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await SimpleOrder.findById(orderId);
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

    if (order.review?.comment || order.review?.rating) {
      console.log(order);
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
    const gig = await SimpleGig.findById(order.gig);
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

// Cancel simple order
export const cancelSimpleOrder = async (
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

    const order = await SimpleOrder.findById(orderId);
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

// Add message to order conversation
export const addSimpleOrderMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // accept both keys for compatibility
    const simpleOrderId = req.body.simpleOrderId || req.body.orderId;
    const { message, attachments } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(simpleOrderId)) {
      return res.status(400).json({ message: "Invalid simple order ID" });
    }

    const order = await SimpleOrder.findById(simpleOrderId);
    if (!order) {
      return res.status(404).json({ message: "Simple order not found" });
    }

    if (
      order.buyer.toString() !== userId?.toString() &&
      order.seller.toString() !== userId?.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const toUserId =
      order.buyer.toString() === userId?.toString() ? order.seller : order.buyer;

    const simpleOrderMessage = new SimpleOrderMessage({
      orderId: simpleOrderId, // ✅ schema field name
      from: userId,
      to: toUserId,
      message,
      attachments: attachments || [],
      kind: "simpleOrderMessage",
      timestamp: new Date(),
    });

    const savedMessage = await simpleOrderMessage.save();
    await savedMessage.populate([
      { path: "from", select: "name pfp" },
      { path: "to", select: "name pfp" },
    ]);

    res.status(200).json({
      message: "Message added successfully",
      data: savedMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const getSimpleOrderMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { me, orderId } = req.query;

    if (!me || !orderId) {
      return res.status(400).json({
        error: "Missing required query parameters: me, other"
      });
    }

    const message = await SimpleOrderMessage.findOne({ orderId })
    .sort({ createdAt: 1 });

    if(!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Add role field to indicate if the message is from the buyer or seller perspective
    if(message.from.toString() == me.toString()) {
      console.log("Message from me:", message);
      message.role = "buyer";
    } else if(message.to.toString() == me.toString()) {
      console.log("Message to me:", message);
      message.role = "seller";
    } else {
      console.log("Message not related to me:", message);
      message.role = "unknown";
    }

    console.log("Final message with role:", message);

    res.status(200).json({
      message
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    next(error);
  }
};