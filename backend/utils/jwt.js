import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export function signToken(user) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: "7d" },
  );
}
