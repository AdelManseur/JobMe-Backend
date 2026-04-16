import { Router } from "express";
import { sendMessage, getMessages, messageRead, setConv, getConv } from "../controllers/chat.controller";
import { protectRoute } from "../middleware/auth.middelware";

const router = Router();


router.post("/message", sendMessage);

router.get("/messages", getMessages);

// Added by me!
router.post("/messageread", messageRead);

// Added by me!
router.post("/conv", setConv);

// Added by me!
router.get("/conv", getConv);

export default router;