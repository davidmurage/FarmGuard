import { Router } from "express";

import { getDashboardOverview } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", auth, getDashboardOverview);

export default router;
