import { Request, Response, NextFunction } from "express";
import { Gig, IGig } from "../models/gig.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";

// Create a new gig
export const createGig = async (
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
      subcategory,
      tags,
      price,
      images,
      faqs,
      requirements
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !subcategory || !price?.basic) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create new gig
    const newGig = new Gig({
      title,
      description,
      category,
      subcategory,
      tags: tags || [],
      price,
      images: images || [],
      seller: sellerId,
      faqs: faqs || [],
      requirements: requirements || []
    });

    const savedGig = await newGig.save();
    await savedGig.populate('seller', 'name email pfp');

    res.status(201).json({
      message: "Gig created successfully",
      gig: savedGig
    });
  } catch (error) {
    next(error);
  }
};

// Get all gigs with filters and pagination
export const getAllGigs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      category,
      subcategory,
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
    if (subcategory) filter.subcategory = subcategory;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    // Price filter (using basic package price)
    if (minPrice || maxPrice) {
      filter['price.basic.price'] = {};
      if (minPrice) filter['price.basic.price'].$gte = Number(minPrice);
      if (maxPrice) filter['price.basic.price'].$lte = Number(maxPrice);
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
      Gig.find(filter)
        .populate('seller', 'name pfp rating')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Gig.countDocuments(filter)
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

// Get single gig by ID
export const getGigById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig ID" });
    }

    const gig = await Gig.findById(gigId)
      .populate('seller', 'name email pfp rating totalOrders lastOnline');

    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    res.status(200).json({ gig });
  } catch (error) {
    next(error);
  }
};

// Get gigs by seller
export const getGigsBySeller = async (
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
      Gig.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Gig.countDocuments(filter)
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

// Update gig
export const updateGig = async (
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
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    if (gig.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Not authorized to update this gig" });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'category', 'subcategory', 'tags',
      'price', 'images', 'faqs', 'requirements', 'isActive'
    ];

    const updates: any = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedGig = await Gig.findByIdAndUpdate(
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

// Delete gig
export const deleteGig = async (
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

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    if (gig.seller.toString() !== userId?.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this gig" });
    }

    await Gig.findByIdAndDelete(gigId);

    res.status(200).json({ message: "Gig deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Toggle gig active status
export const toggleGigStatus = async (
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

    const gig = await Gig.findById(gigId);
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

// Get gig categories
export const getCategories = async (
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
      'Lifestyle',
    ];

    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};