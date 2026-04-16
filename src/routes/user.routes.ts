import { Router } from "express";
import { LogIn, LogOut, SignIn, UpdateProfile, GetMe, GetDetails } from "../controllers/auth.controller";
import { protectRoute } from "../middleware/auth.middelware";
import { upload } from '../controllers/upload.controller';
const router = Router();

router.post("/signin", upload.single("pfp"), SignIn);
router.post("/login", LogIn);
router.post("/logout", LogOut);
router.put("/update-profile", protectRoute, upload.single("pfp"), UpdateProfile)
// New endpoint
router.get("/me", protectRoute, GetMe);
// New endpoint
router.get("/get-details", protectRoute, GetDetails);

export default router;
