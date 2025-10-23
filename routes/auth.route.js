import Router from "express";
import {
  changePassword,
  getUser,
  login,
  logout,
  registerUser,
} from "../controllers/auth.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { restrict } from "../middleware/restrict.js";

const router = Router();

router.post("/register", registerUser);

router.post("/login", login);

router.get("/me", getUser);

router.post("/change-password", changePassword);

router.post("/logout", logout);

export default router;

