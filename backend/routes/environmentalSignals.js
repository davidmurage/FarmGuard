import { Router } from "express";

import {
  createEnvironmentalSignal,
  deleteEnvironmentalSignal,
  importEnvironmentalFeed,
  listEnvironmentalImportJobs,
  listEnvironmentalProviders,
  listEnvironmentalSignals,
  syncEnvironmentalProvider,
  updateEnvironmentalSignal,
} from "../controllers/environmentalSignalController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.route("/").get(auth, authorize("ADMIN"), listEnvironmentalSignals).post(auth, authorize("ADMIN"), createEnvironmentalSignal);
router.get("/import-jobs", auth, authorize("ADMIN"), listEnvironmentalImportJobs);
router.post("/import", auth, authorize("ADMIN"), importEnvironmentalFeed);
router.get("/providers", auth, authorize("ADMIN"), listEnvironmentalProviders);
router.post("/providers/:providerKey/sync", auth, authorize("ADMIN"), syncEnvironmentalProvider);
router.patch("/:signalId", auth, authorize("ADMIN"), updateEnvironmentalSignal);
router.delete("/:signalId", auth, authorize("ADMIN"), deleteEnvironmentalSignal);

export default router;
