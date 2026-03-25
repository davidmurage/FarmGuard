import { Router } from "express";

import { exportAnalyticsCsv, exportAnalyticsPdf, getAnalyticsOverview } from "../controllers/analyticsController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/overview", auth, authorize("ADMIN", "PARTNER"), getAnalyticsOverview);
router.get("/export/csv", auth, authorize("ADMIN", "PARTNER"), exportAnalyticsCsv);
router.get("/export/pdf", auth, authorize("ADMIN", "PARTNER"), exportAnalyticsPdf);

export default router;
