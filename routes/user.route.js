import { Router } from "express";
import {
  addUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "../controllers/user.controller.js";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";

const router = Router();

router.get("/", protectRoutes, restrict("admin"), getAllUsers);

router.post("/", protectRoutes, restrict("admin"), addUser);

router.get("/:id", protectRoutes, restrict("admin"), getUserById);

router.put("/:id", protectRoutes, restrict("admin"), updateUser);

router.delete("/:id", protectRoutes, restrict("admin"), deleteUser);

export default router;

//protectRoutes, restrict("admin")
