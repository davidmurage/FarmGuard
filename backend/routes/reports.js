import { Router } from "express";

import { createReport, deleteReport, listReports, reviewReport, updateReport } from "../controllers/reportController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, authorize("FARMER", "VET", "ADMIN"), listReports).post(auth, authorize("FARMER", "VET"), createReport);
router.patch("/:reportId", auth, authorize("FARMER"), updateReport);
router.delete("/:reportId", auth, authorize("FARMER"), deleteReport);
router.patch("/:reportId/review", auth, authorize("VET", "ADMIN"), reviewReport);

export default router;
