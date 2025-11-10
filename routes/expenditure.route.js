import { Router } from "express";
import { addExpenditure, approveExpenditure, deleteExpenditure, getAllExpenditure, reviewExpenditure, updateExpenditure } from "../controllers/expenditure.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";
import { restrict } from "../middleware/restrict.js";


const router = Router();

router.use(protectRoutes);

router.post("/", restrict("data_entry"), addExpenditure);

router.put("/:id", restrict("data_entry"), updateExpenditure);

router.delete("/:id", restrict("data_entry"), deleteExpenditure);

//reviewer
router.patch("/:id/review", restrict("reviewer"), reviewExpenditure);

//approver
router.patch("/:id/approve", restrict("approver"), approveExpenditure);

router.get("/", getAllExpenditure);

export default router;