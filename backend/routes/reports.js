import { Router } from "express";

import { createReport, listReports, reviewReport } from "../controllers/reportController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, listReports).post(auth, createReport);
router.patch("/:reportId/review", auth, authorize("VET", "ADMIN"), reviewReport);

export default router;
