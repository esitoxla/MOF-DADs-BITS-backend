import { Router } from "express";
import { protectRoutes } from "../middleware/routesProtect.js";
import { exportNaturalAccountExcel, exportNaturalAccountPDF, getNaturalAccountReport } from "../controllers/naturalAccountReport.controller.js";

const router = Router();

router.get("/quarterly", protectRoutes, getNaturalAccountReport);

router.get("/quarterly/excel", protectRoutes, exportNaturalAccountExcel);

router.get("/quarterly/pdf", protectRoutes, exportNaturalAccountPDF);

export default router;