import { Router } from "express";
import { getAppropriationSummary } from "../controllers/appropriation.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";

const router = Router();

router.get("/summary", protectRoutes, getAppropriationSummary);

export default router;