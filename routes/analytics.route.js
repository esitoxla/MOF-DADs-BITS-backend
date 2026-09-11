import { Router } from "express";
import { protectRoutes } from "../middleware/routesProtect.js";
import { getDashboardAnalytics } from "../controllers/analytics.controller.js";

const router = Router();

router.get("/dashboard", protectRoutes, getDashboardAnalytics);

export default router;
