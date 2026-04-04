import { Router } from "express";
import { restrict } from "../middleware/restrict.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { addReallocation, approveReallocation, deleteReallocation, getAllReallocation, reviewReallocation, updateReallocation } from "../controllers/reallocation.controller.js";

const router = Router();

router.use(protectRoutes);

router.post("/", restrict("data_entry", "admin"), addReallocation);

router.put("/:id", restrict("data_entry", "admin"), updateReallocation);

router.delete("/:id", restrict("data_entry", "admin"), deleteReallocation);

//reviewer
router.patch("/:id/review", restrict("reviewer", "admin"), reviewReallocation);

//approver
router.patch("/:id/approve", restrict("approver", "admin"), approveReallocation);

router.get("/", getAllReallocation);

export default router;