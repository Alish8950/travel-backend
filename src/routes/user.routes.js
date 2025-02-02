import { Router } from "express";
import {
  changeCurrentPassword,
  getAllUsers,
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  getUserChannelProfile,
  getCurrentUser
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/allUsers").get(getAllUsers);

//Secured Routes
router.route("/logout").post(logoutUser);
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/c/:username").post(verifyJWT, getUserChannelProfile)
router.route("/current-user").post(getCurrentUser)

export default router;
