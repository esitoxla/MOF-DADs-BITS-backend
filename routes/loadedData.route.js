import { Router } from "express";
import {
  createLoadedData,
  downloadAppropriationTemplate,
  uploadExcelLoadedData,
} from "../controllers/loadedData.controller.js";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import uploadExcel from "../middleware/uploadExcel.js";

const router = Router();

router.post("/", protectRoutes, restrict("admin"), createLoadedData);

router.post(
  "/upload-excel",
  protectRoutes,
  restrict("admin"),
  uploadExcel.single("file"),
  uploadExcelLoadedData
);

router.get(
  "/template",
  protectRoutes,
  restrict("admin"),
  downloadAppropriationTemplate
);

export default router;
