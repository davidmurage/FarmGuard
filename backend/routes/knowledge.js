import { Router } from "express";

import {
  createKnowledgeArticle,
  getRecommendedKnowledgeArticles,
  listKnowledgeArticles,
} from "../controllers/knowledgeController.js";
import { auth, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, listKnowledgeArticles);
router.get("/recommendations", auth, getRecommendedKnowledgeArticles);
router.post("/", auth, authorize("ADMIN"), createKnowledgeArticle);

export default router;
