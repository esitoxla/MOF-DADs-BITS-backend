import { Router } from "express";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { addRevenue, approveRevenue, deleteRevenue, getAllRevenue, reviewRevenue, updateRevenue } from "../controllers/revenue.controller.js";

const router = Router();

router.use(protectRoutes);

router.post("/", restrict("data_entry", "admin"), addRevenue);

router.put("/:id", restrict("data_entry", "admin"), updateRevenue);

router.delete("/:id", restrict("data_entry", "admin"), deleteRevenue);

//reviewer
router.patch("/:id/review", restrict("reviewer", "admin"), reviewRevenue);

//approver
router.patch("/:id/approve", restrict("approver", "admin"), approveRevenue);

router.get("/", getAllRevenue);

export default router;