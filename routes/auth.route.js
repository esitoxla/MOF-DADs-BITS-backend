import Router from "express";
import {
  changePassword,
  getUser,
  login,
  logout,
  refreshToken,
  registerUser,
  removeAvatar,
  updateAvatar,
} from "../controllers/auth.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { upload } from "../middleware/uploadProfile.js";

const router = Router();

router.post("/register", registerUser);

router.post("/login", login);

router.get("/me", getUser);

router.post("/change-password",protectRoutes, changePassword);

router.patch("/upload-avatar", protectRoutes, upload.single("avatar"), updateAvatar);

router.patch("/remove-avatar", protectRoutes, removeAvatar);

router.get("/refresh", refreshToken);

router.post("/logout", logout);

export default router;

