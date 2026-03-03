import { Router } from "express";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import uploadExcel from "../middleware/uploadExcel.js";
import { bulkUploadActivities, createActivities, deleteActivity, downloadActivityTemplate, getAllActivities, getMyActivities, updateActivity } from "../controllers/activities.controller.js";

const router = Router();

router.post("/", protectRoutes, restrict("admin"), createActivities);

router.get("/", protectRoutes, restrict("admin"), getAllActivities);

router.get("/my", protectRoutes, getMyActivities);

router.post(
  "/upload-activity-excel",
  protectRoutes,
  restrict("admin"),
  uploadExcel.single("file"),
  bulkUploadActivities,
);

router.get(
  "/template",
  protectRoutes,
  restrict("admin"),
  downloadActivityTemplate,
);

router.delete("/:id", protectRoutes, restrict("admin"), deleteActivity);

router.put("/:id", protectRoutes, restrict("admin"), updateActivity);

export default router;
