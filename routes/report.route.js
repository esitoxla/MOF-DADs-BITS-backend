import { Router } from "express";
import {
  exportQuarterlyReportExcel,
  exportQuarterlyReportPDF,
  getDetailedEC,
  getQuarterlyReport,
} from "../controllers/report.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";

const router = Router();

router.get("/quarterly", protectRoutes, getQuarterlyReport);

router.get("/quarterly/excel", protectRoutes, exportQuarterlyReportExcel);

router.get("/quarterly/pdf", protectRoutes, exportQuarterlyReportPDF);

// Detailed EC
router.get("/detailed", protectRoutes, getDetailedEC);

export default router;
