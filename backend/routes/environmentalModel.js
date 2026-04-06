import { Router } from "express";

import { retrainEnvironmentalModel } from "../controllers/environmentalModelController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/train", auth, authorize("ADMIN"), retrainEnvironmentalModel);

export default router;
