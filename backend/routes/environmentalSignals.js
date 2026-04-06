import { Router } from "express";

import {
  createEnvironmentalSignal,
  deleteEnvironmentalSignal,
  listEnvironmentalSignals,
  updateEnvironmentalSignal,
} from "../controllers/environmentalSignalController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, authorize("ADMIN"), listEnvironmentalSignals).post(auth, authorize("ADMIN"), createEnvironmentalSignal);
router.patch("/:signalId", auth, authorize("ADMIN"), updateEnvironmentalSignal);
router.delete("/:signalId", auth, authorize("ADMIN"), deleteEnvironmentalSignal);

export default router;
