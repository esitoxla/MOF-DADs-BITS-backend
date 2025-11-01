import { Router } from "express";
import { getQuarterlyReport } from "../controllers/report.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";


const router = Router();

router.get("/quarterly", protectRoutes, getQuarterlyReport);

export default router;