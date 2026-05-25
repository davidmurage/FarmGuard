import { Router } from "express";

import {
  getDashboardOverview,
  getEnvironmentalBrief,
  getLocalizedRiskScores,
  getRiskMapOverview,
} from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", auth, getDashboardOverview);
router.get("/risk-map", auth, getRiskMapOverview);
router.get("/local-risk-scores", auth, getLocalizedRiskScores);
router.get("/environmental-brief", auth, getEnvironmentalBrief);

export default router;
