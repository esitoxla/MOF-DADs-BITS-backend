import { Router } from "express";
import { protectRoutes } from "../middleware/routesProtect.js";
import { exportQuarterlyRevenueExcel, exportQuarterlyRevenuePDF, getQuarterlyRevenueReport } from "../controllers/revenueReport.controller.js";



const router = Router();

router.get("/quarterly", protectRoutes, getQuarterlyRevenueReport);

router.get("/quarterly/excel", protectRoutes, exportQuarterlyRevenueExcel);

router.get("/quarterly/pdf", protectRoutes, exportQuarterlyRevenuePDF);

export default router;