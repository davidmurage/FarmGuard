import { Router } from "express";

import { submitUssdReport, submitWhatsAppReport } from "../controllers/fieldChannelController.js";

const router = Router();

router.post("/ussd/report", submitUssdReport);
router.post("/whatsapp/report", submitWhatsAppReport);

export default router;
