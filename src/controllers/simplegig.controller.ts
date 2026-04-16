import { Request, Response, NextFunction } from "express";
import { SimpleGig, ISimpleGig } from "../models/simplegig.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";

// Create a new simple gig
export const createSimpleGig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      title,
      description,
      category,
      tags,
      price,
      deliveryTime,
      revisions,
      features,
      images,
      questions
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !price || !deliveryTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create new simple gig
    const newGig = new SimpleGig({
      title,
      description,
      category,
      tags: tags || [],
      price,
      deliveryTime,
      revisions: revisions || 0,
      features: features || [],
      images: images || [],
      seller: sellerId,
      questions: questions || []
    });

    const savedGig = await newGig.save();
    await savedGig.populate('seller', 'name email pfp');

    res.status(201).json({
      message: "Simple gig created successfully",
      gig: savedGig
    });
  } catch (error) {
    next(error);
  }
};

// Get all simple gigs with filters and pagination
export const getAllSimpleGigs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    // Build filter object
    const filter: any = { isActive: true };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [gigs, totalCount] = await Promise.all([
      SimpleGig.find(filter)
        .populate('seller', 'name pfp rating')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SimpleGig.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      gigs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single simple gig by ID
export const getSimpleGigById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig ID" });
    }

    const gig = await SimpleGig.findById(gigId)
      .populate('seller', 'name email pfp rating totalOrders lastOnline');

    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    res.status(200).json({ gig });
  } catch (error) {
    next(error);
  }
};

// Get simple gigs by seller
export const getSimpleGigsBySeller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: "Invalid seller ID" });
    }

    const filter: any = { seller: sellerId };
    if (status === 'active' || status === 'inactive') {
      filter.isActive = status === 'active';
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(20, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [gigs, totalCount] = await Promise.all([
      SimpleGig.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SimpleGig.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      gigs,
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

// Update simple gig
export const updateSimpleGig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gigId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig ID" });
    }

    // Find the gig and check ownership
    const gig = await SimpleGig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    if (gig.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Not authorized to update this gig" });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'category', 'tags', 'price',
      'deliveryTime', 'revisions', 'features', 'images', 'isActive'
    ];

    const updates: any = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedGig = await SimpleGig.findByIdAndUpdate(
      gigId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('seller', 'name email pfp');

    res.status(200).json({
      message: "Gig updated successfully",
      gig: updatedGig
    });
  } catch (error) {
    next(error);
  }
};

// Delete simple gig
export const deleteSimpleGig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gigId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig ID" });
    }

    const gig = await SimpleGig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    if (gig.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this gig" });
    }

    await SimpleGig.findByIdAndDelete(gigId);

    res.status(200).json({ message: "Gig deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Toggle simple gig active status
export const toggleSimpleGigStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gigId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig ID" });
    }

    const gig = await SimpleGig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    if (gig.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this gig" });
    }

    gig.isActive = !gig.isActive;
    await gig.save();

    res.status(200).json({
      message: `Gig ${gig.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: gig.isActive
    });
  } catch (error) {
    next(error);
  }
};

// Get simple gig categories
export const getSimpleGigCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = [
      'Graphics & Design',
      'Digital Marketing',
      'Writing & Translation',
      'Video & Animation',
      'Music & Audio',
      'Programming & Tech',
      'Data',
      'Business',
      'Lifestyle'
    ];

    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};