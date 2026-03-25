import { Router } from "express";

import { getDashboardOverview, getRiskMapOverview } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", auth, getDashboardOverview);
router.get("/risk-map", auth, getRiskMapOverview);

export default router;
