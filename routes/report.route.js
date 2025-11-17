import { Router } from "express";
import { exportQuarterlyReportExcel, exportQuarterlyReportPDF, getQuarterlyReport } from "../controllers/report.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";


const router = Router();

router.get("/quarterly", protectRoutes, getQuarterlyReport);

router.get("/quarterly/excel", protectRoutes, exportQuarterlyReportExcel);

router.get("/quarterly/pdf", protectRoutes, exportQuarterlyReportPDF);

export default router;