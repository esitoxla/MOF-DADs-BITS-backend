import { Router } from "express";
import { addUser, deleteUser, getAllUsers, getUserById, updateUser } from "../controllers/user.controller.js";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";

const router = Router();

router.get("/", getAllUsers);

router.post("/", addUser);

router.get("/:id", getUserById);

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;


//protectRoutes, restrict("admin")