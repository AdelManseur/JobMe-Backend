import { AICHATBOT } from "../services/ai.services";
import { Router } from "express";
import { sendMessageAI , getMessagesAI } from "../controllers/aichat.controller";
import { protectRoute } from "../middleware/auth.middelware";

const router = Router();

router.post("/message", sendMessageAI);

router.get("/message", getMessagesAI);

export default router;