import Router from "express";
import {
  changePassword,
  login,
  logout,
  registerUser,
} from "../controllers/auth.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { restrict } from "../middleware/restrict.js";

const router = Router();

router.post("/register", registerUser);

router.post("/login", login);

router.post("/change-password", changePassword);

router.post("/logout", logout);

export default router;

