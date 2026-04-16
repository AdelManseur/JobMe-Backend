import { upload } from "../middleware/multer.middleware";

router.post("/users/signin", upload.single("pfp"), SignIn);
router.put("/users/update-profile", protectRoute, upload.single("pfp"), UpdateProfile);