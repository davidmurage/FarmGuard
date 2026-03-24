import bcrypt from "bcryptjs";

import User, { SELF_SIGNUP_ROLES } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { serializeUser } from "../utils/serializers.js";

export const register = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim()?.toLowerCase();
  const password = req.body.password;
  const role = SELF_SIGNUP_ROLES.includes(req.body.role) ? req.body.role : "FARMER";

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required.");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already in use.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: passwordHash,
    role,
  });

  res.status(201).json({
    message: "Account created successfully.",
    token: signToken(user),
    user: serializeUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim()?.toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid credentials.");
  }

  res.json({
    message: "Login successful.",
    token: signToken(user),
    user: serializeUser(user),
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("_id name email role createdAt updatedAt");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  res.json({ user: serializeUser(user) });
});
