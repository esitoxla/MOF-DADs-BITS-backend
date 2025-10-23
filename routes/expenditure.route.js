import { Router } from "express";
import { addExpenditure, getAllExpenditure } from "../controllers/expenditure.controller.js";
import { protectRoutes } from "../middleware/routesProtect.js";


const router = Router();

router.post("/", protectRoutes, addExpenditure);

router.get("/", protectRoutes, getAllExpenditure);

export default router;