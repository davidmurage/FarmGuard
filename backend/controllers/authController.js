import bcrypt from "bcryptjs";

import User, { SELF_SIGNUP_ROLES } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { buildStoredLocation, hasCounty } from "../utils/locationTargeting.js";
import { normalizePhoneNumber } from "../utils/phoneNumber.js";
import { serializeUser } from "../utils/serializers.js";

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
}

function buildNotificationPreferences(input = {}, fallback = {}) {
  return {
    sms: parseBoolean(input.sms, fallback.sms ?? true),
    whatsapp: parseBoolean(input.whatsapp, fallback.whatsapp ?? false),
    inApp: parseBoolean(input.inApp, fallback.inApp ?? true),
  };
}

function sanitizePhoneNumberInput(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const phoneNumber = normalizePhoneNumber(rawValue);

  if (!phoneNumber) {
    throw new ApiError(400, "Phone number must be in a valid international format such as +254712345678.");
  }

  return phoneNumber;
}

function ensurePhoneForNotifications(phoneNumber, notificationPreferences) {
  if ((notificationPreferences.sms || notificationPreferences.whatsapp) && !phoneNumber) {
    throw new ApiError(400, "Add a phone number before enabling SMS or WhatsApp alerts.");
  }
}

function ensureCountyForLocalWarnings(role, location) {
  if (["FARMER", "VET"].includes(role) && !hasCounty(location)) {
    throw new ApiError(400, "County is required so FarmGuard can send you local outbreak warnings.");
  }
}

export const register = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim()?.toLowerCase();
  const password = req.body.password;
  const role = SELF_SIGNUP_ROLES.includes(req.body.role) ? req.body.role : "FARMER";
  const phoneNumber = sanitizePhoneNumberInput(req.body.phoneNumber);
  const location = buildStoredLocation({
    locationName: req.body.locationName,
    county: req.body.county,
  });

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

  ensureCountyForLocalWarnings(role, location);

  const notificationPreferences = buildNotificationPreferences(req.body.notificationPreferences, {
    sms: Boolean(phoneNumber),
    whatsapp: Boolean(phoneNumber),
    inApp: true,
  });

  ensurePhoneForNotifications(phoneNumber, notificationPreferences);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: passwordHash,
    role,
    phoneNumber,
    location,
    notificationPreferences,
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
  const user = await User.findById(req.user.id).select("_id name email role phoneNumber location notificationPreferences createdAt updatedAt");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  res.json({ user: serializeUser(user) });
});

export const updateCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (req.body.email !== undefined) {
    const nextEmail = req.body.email?.trim()?.toLowerCase();

    if (!nextEmail) {
      throw new ApiError(400, "Email cannot be empty.");
    }

    const existingUser = await User.findOne({
      email: nextEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      throw new ApiError(409, "Email already in use.");
    }

    user.email = nextEmail;
  }

  if (req.body.name !== undefined) {
    const nextName = req.body.name?.trim();

    if (!nextName) {
      throw new ApiError(400, "Name cannot be empty.");
    }

    user.name = nextName;
  }

  if (req.body.phoneNumber !== undefined) {
    user.phoneNumber = sanitizePhoneNumberInput(req.body.phoneNumber);
  }

  if (req.body.locationName !== undefined || req.body.county !== undefined) {
    const currentLocation = user.location?.toObject ? user.location.toObject() : user.location || {};
    const nextLocation = buildStoredLocation(
      {
        locationName: req.body.locationName,
        county: req.body.county,
      },
      currentLocation,
    );

    ensureCountyForLocalWarnings(user.role, nextLocation);
    user.location = nextLocation;
  }

  if (req.body.notificationPreferences !== undefined) {
    const currentPreferences = user.notificationPreferences?.toObject
      ? user.notificationPreferences.toObject()
      : user.notificationPreferences || {};

    user.notificationPreferences = buildNotificationPreferences(req.body.notificationPreferences, currentPreferences);
  }

  const nextNotificationPreferences = user.notificationPreferences?.toObject
    ? user.notificationPreferences.toObject()
    : user.notificationPreferences || {};

  ensurePhoneForNotifications(user.phoneNumber || "", nextNotificationPreferences);

  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;

  if (currentPassword !== undefined || newPassword !== undefined) {
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current password and new password are both required to change your password.");
    }

    if (String(newPassword).length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters.");
    }

    const passwordMatches = await bcrypt.compare(String(currentPassword), user.password);

    if (!passwordMatches) {
      throw new ApiError(401, "Current password is incorrect.");
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
  }

  await user.save();

  res.json({
    message: "Profile updated successfully.",
    user: serializeUser(user),
  });
});
