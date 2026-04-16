import { Request, Response, NextFunction } from "express";
import { Message } from "../models/message.model";
import { Conversation } from "../models/conversation.model";
import { getSocketIO, getConnectedUsers } from "../lib/socket";

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { from, to, content } = req.body;

    if (!from || !to || !content) {
      return res.status(400).json({
        error: "Missing required fields: from, to, content"
      });
    }
      

    const message = new Message({
      from,
      to,
      content
    });

    const savedMessage = await message.save();


    const io = getSocketIO();
    const connectedUsers = getConnectedUsers();


    const receiverSocketId = connectedUsers.get(to);

    if (receiverSocketId) {

      io.to(receiverSocketId).emit("newMessage", {
        _id: savedMessage._id,
        from: savedMessage.from,
        to: savedMessage.to,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
        read: savedMessage.read
      });
    }


    res.status(201).json({
      message: "Message sent successfully",
      data: {
        _id: savedMessage._id,
        from: savedMessage.from,
        to: savedMessage.to,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
        read: savedMessage.read
      }
    });

  } catch (error) {
    console.error("Error sending message:", error);
    next(error);
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId1, userId2 } = req.query;

    if (!userId1 || !userId2) {
      return res.status(400).json({
        error: "Missing required query parameters: userId1, userId2"
      });
    }


    const messages = await Message.find({
      $or: [
        { from: userId1, to: userId2 },
        { from: userId2, to: userId1 }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json({
      messages
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    next(error);
  }
};

export const messageRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.body;
    
    // 1. Update the DB
    const message = await Message.findByIdAndUpdate(messageId, { read: true }, { new: true });
    
    if (!message) return res.status(404).json({ error: "Message not found" });

    // 2. TELL THE SENDER (Real-time update)
    const io = getSocketIO();
    const connectedUsers = getConnectedUsers();
    const senderSocketId = connectedUsers.get(message.from.toString());

    if (senderSocketId) {
      // We send the 'messageRead' event to the person who SENT the message
      io.to(senderSocketId).emit("messageRead", { messageId: message._id });
    }

    res.status(200).json({ message: "Success", data: message });
  } catch (error) {
    next(error);
  }
};

export const setConv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user1Id, user2Id } = req.body;

    if (!user1Id || !user2Id) {
      return res.status(400).json({
        error: "Missing required fields: user1Id, user2Id"
      });
    }

    // We don't check who's the buyer and seller, we just create a conversation between 2 users.
    const conversations = await Conversation.find({
      $or: [
        { user1Id: user1Id, user2Id: user2Id },
        { user1Id: user2Id, user2Id: user1Id }
      ]
    }).sort({ createdAt: 1 });

    if (conversations.length > 0) {
      return res.status(200).json({
        status: "exists",
      });
    }
    
    const conversation = new Conversation({
      user1Id: user1Id,
      user2Id: user2Id
    });

    await conversation.save();

    res.status(200).json({
      conversation: conversation
    });

  } catch (error) {
    console.error("Error setting conversation:", error);
    next(error);
  }
};

export const getConv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing required query parameter: userId"
      });
    }
    
    const conversations = await Conversation.find({
      $or: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      conversations
    });

  } catch (error) {
    console.error("Error getting conversation:", error);
    next(error);
  }
};