import { Request, Response, NextFunction } from "express";
import { AIMessage } from "../models/aimessage.model";
import { getSocketIO, getConnectedUsers } from "../lib/socket";
import { AICHATBOT } from "../services/ai.services";
export const sendMessageAI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Received request to send AI message:", req.body);
  try {
    const { from, to, content } = req.body;

    
    if (!from || !to || !content) {
      return res.status(400).json({
        error: "Missing required fields: from, to, content"
      });
    }
      
    const message = new AIMessage({
      from,
      to,
      content
    });

    const savedMessage = await message.save();

    // Add pre content
    const preContent = `Hello. You are an AI assistant for a freelancing platform called JobMe.
      Your task is to help users find suitable gigs based on their skills and preferences.
      When a user sends you a message,
      analyze their request and respond with relevant gig tags.
      available gig tags (select from these only): UX, Web, Development, Tailwind, CSS, Design, Video, UI, Figma, Logo, a.
      Don't respond in your way, but respond STRICTLY in this format:
      ["tag1", "tag2", "tag3", ...] (not necessarily 3 tags, but at least 1 tag if you find any relevant tag, otherwise respond with an empty array [])
      If this message is not a request for gig recommendations, respond appropriately based on the user's query.
      User request: `;
    const finalContent = preContent + savedMessage.content;

    const io = getSocketIO();
    const connectedUsers = getConnectedUsers();
    const AIRESPONSE = await AICHATBOT(finalContent);

    const aiMessage = new AIMessage({
      from:savedMessage.to,
      to:savedMessage.from,
      content:AIRESPONSE
    });
    const savedaiMessage = await aiMessage.save()

    const receiverSocketId = connectedUsers.get(savedMessage.from);

    if (receiverSocketId) {

      io.to(receiverSocketId).emit("newMessage", {
        _id: savedaiMessage._id,
        from: savedaiMessage.from,
        to: savedaiMessage.to,
        content: savedaiMessage.content,
        createdAt: savedaiMessage.createdAt,
      });
    }
    


    res.status(201).json({
      message: "Message sent successfully",
      data: {
        _id: savedMessage._id,
        from: savedMessage.from,
        to: savedMessage.to,
        content: savedMessage.content,
        aireply: savedaiMessage.content,
        createdAt: savedMessage.createdAt,
      }
    });

  } catch (error) {
    console.error("Error sending message:", error);
    next(error);
  }
};

export const getMessagesAI = async (
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


    const messages = await AIMessage.find({
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
