import { Router } from "express";
import { protectRoute } from "../middleware/auth.middelware";
const router = Router();
import { verifyOTPAndCreateAccount } from "../controllers/verification.controller";
router.post('/verify-otp', verifyOTPAndCreateAccount);