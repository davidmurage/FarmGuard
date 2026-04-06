import { Router } from "express";

import { getDashboardOverview, getEnvironmentalBrief, getRiskMapOverview } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", auth, getDashboardOverview);
router.get("/risk-map", auth, getRiskMapOverview);
router.get("/environmental-brief", auth, getEnvironmentalBrief);

export default router;
