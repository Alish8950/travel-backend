import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createPost,
  deletePost,
  editPost,
  getAllPosts,
  getCurrentPost,
} from "../controllers/travelEntry.controllers.js";

const router = Router();

router.route("/travel-entry").post(
  upload.fields([
    {
      name: "visualMemories",
      maxCount: 10,
    },
  ]),
  createPost
);

router.route("/all-entries").get(getAllPosts);
router.route("/single-entry/:post").get(getCurrentPost);
router.route("/edit-travel-entry/:post").post(editPost);
router.route("/delete-travel-entry/:post").post(deletePost);

// //Secured Routes
// router.route("/change-password").post(verifyJWT, changeCurrentPassword)

export default router;
