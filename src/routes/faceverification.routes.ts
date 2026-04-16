import { Router } from "express";
import { upload } from "../controllers/upload.controller";
import { verifyIdFace } from "../controllers/verification.controller";
import { protectRoute } from "../middleware/auth.middelware";

const router = Router();

router.post(
  "/verify-id",
  protectRoute,
  upload.fields([
    { name: "idImage", maxCount: 1 },
    { name: "selfies", maxCount: 5 },
    { name: "selfie", maxCount: 5 },
  ]),
  verifyIdFace
);

export default router;