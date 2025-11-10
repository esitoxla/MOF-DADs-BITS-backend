import { Router } from "express";
import { addExpenditure, approveExpenditure, deleteExpenditure, getAllExpenditure, reviewExpenditure, updateExpenditure } from "../controllers/expenditure.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { restrict } from "../middleware/restrict.js";


const router = Router();

router.use(protectRoutes);

router.post("/", restrict("data_entry", "admin"), addExpenditure);

router.put("/:id", restrict("data_entry", "admin"), updateExpenditure);

router.delete("/:id", restrict("data_entry", "admin"), deleteExpenditure);

//reviewer
router.patch("/:id/review", restrict("reviewer", "admin"), reviewExpenditure);

//approver
router.patch("/:id/approve", restrict("approver", "admin"), approveExpenditure);

router.get("/", getAllExpenditure);

export default router;