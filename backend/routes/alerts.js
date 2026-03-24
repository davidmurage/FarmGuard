import { Router } from "express";

import { createAlert, listActiveAlerts } from "../controllers/alertController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, listActiveAlerts).post(auth, authorize("ADMIN"), createAlert);

export default router;
