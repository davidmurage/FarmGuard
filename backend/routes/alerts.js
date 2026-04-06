import { Router } from "express";

import { createAlert, deleteAlert, listAlerts, updateAlert } from "../controllers/alertController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, listAlerts).post(auth, authorize("ADMIN"), createAlert);
router.patch("/:alertId", auth, authorize("ADMIN"), updateAlert);
router.delete("/:alertId", auth, authorize("ADMIN"), deleteAlert);

export default router;
