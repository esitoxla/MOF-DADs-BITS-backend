import { Router } from "express";
import { protectRoutes } from "../middleware/routesProtect.js";
import { getBudgetValues, getNaturalAccounts } from "../controllers/budget.controller.js";

const router = Router();

router.get("/natural-accounts", protectRoutes, getNaturalAccounts);
router.get("/values", protectRoutes, getBudgetValues);

export default router;