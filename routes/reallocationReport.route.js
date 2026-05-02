import { Router } from "express";
import { protectRoutes } from "../middleware/routesProtect.js";
import { exportReallocationSummaryExcel, exportReallocationSummaryPDF, getDetailedReallocationReport, getQuarterlyReallocationReport } from "../controllers/reallocationReport.controller.js";

const router = Router();

router.get("/quarterly", protectRoutes, getQuarterlyReallocationReport);

router.get("/quarterly/excel", protectRoutes, exportReallocationSummaryExcel);

router.get("/quarterly/pdf", protectRoutes, exportReallocationSummaryPDF);

// Detailed RE
router.get("/detailed", protectRoutes, getDetailedReallocationReport);

export default router;
