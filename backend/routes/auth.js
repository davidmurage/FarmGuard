import { Router } from "express";

import { getCurrentUser, login, register, updateCurrentUser } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getCurrentUser);
router.patch("/me", auth, updateCurrentUser);

export default router;
