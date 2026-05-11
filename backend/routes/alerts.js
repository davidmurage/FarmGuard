import { Router } from "express";

import { createAlert, deleteAlert, deliverAlert, listAlerts, updateAlert } from "../controllers/alertController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, listAlerts).post(auth, authorize("ADMIN"), createAlert);
router.post("/:alertId/deliver", auth, authorize("ADMIN"), deliverAlert);
router.patch("/:alertId", auth, authorize("ADMIN"), updateAlert);
router.delete("/:alertId", auth, authorize("ADMIN"), deleteAlert);

export default router;
