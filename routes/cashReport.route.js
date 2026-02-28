import { Router } from "express";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { exportCashPositionExcel, exportCashPositionPDF, getCashPositionReport, getDetailedCashReport } from "../controllers/cashReport.controller.js";
const router = Router();

router.get("/quarterly", protectRoutes, getCashPositionReport);

router.get("/quarterly/excel", protectRoutes, exportCashPositionExcel);

router.get("/quarterly/pdf", protectRoutes, exportCashPositionPDF);

router.get("/detailed", protectRoutes, getDetailedCashReport);


export default router;