import { Router } from "express";
import { protectRoutes } from "../middleware/routesProtect.js";
import {
  getMyNotifications,
  markNotificationRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(protectRoutes);

router.get("/", getMyNotifications);

router.patch("/:id/read", markNotificationRead);

export default router;
