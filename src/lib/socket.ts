import { Server } from "socket.io";
import { Server as HTTPServer } from "http";

let io: Server;
const connectedUsers = new Map<string, string>();

export const initializeSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5500", 
        "http://127.0.0.1:5500", 
        "http://localhost:8080", 
        "http://127.0.0.1:3000"
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);


    const userId = socket.handshake.query.userId as string;

    if (userId) {
      connectedUsers.set(userId, socket.id);
      console.log(`User ${userId} connected with socket ${socket.id}`);
      
      socket.join(userId);
      
      socket.broadcast.emit("userOnline", userId);
    }

    socket.on("joinRoom", (roomId: string) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("markAsRead", ({ messageId, userId }) => {

      socket.broadcast.emit("messageRead", { messageId, userId });
    });

    socket.on("typing", ({ to, from }) => {
      const receiverSocketId = connectedUsers.get(to);
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("userTyping", { from });
      }
    });

    socket.on("stopTyping", ({ to, from }) => {
      const receiverSocketId = connectedUsers.get(to);
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("userStoppedTyping", { from });
      }
    });


    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      

      let disconnectedUserId: string | null = null;
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        console.log(`User ${disconnectedUserId} disconnected`);

        socket.broadcast.emit("userOffline", disconnectedUserId);
      }
    });
  });

  return io;
};

export const getSocketIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized! Call initializeSocket first.");
  }
  return io;
};

export const getConnectedUsers = (): Map<string, string> => {
  return connectedUsers;
};

export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId);
};

export const getOnlineUsers = (): string[] => {
  return Array.from(connectedUsers.keys());
};
