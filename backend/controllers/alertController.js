import mongoose from "mongoose";

import Alert from "../models/Alert.js";
import { ROLES } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeAlert } from "../utils/serializers.js";

const ALERT_AUDIENCES = [...ROLES, "ALL"];
const ALERT_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => String(item).trim()).filter(Boolean);
}

function sanitizeTargetRoles(targetRoles) {
  return sanitizeItems(targetRoles).filter((role) => ALERT_AUDIENCES.includes(role));
}

function sanitizeRiskLevel(riskLevel) {
  return ALERT_RISK_LEVELS.includes(String(riskLevel || "").trim()) ? String(riskLevel).trim() : "MEDIUM";
}

function sanitizeAlertPayload(body, { requireCoreFields = false } = {}) {
  const payload = {};

  if (body.title !== undefined) {
    payload.title = body.title?.trim();
  }

  if (body.message !== undefined) {
    payload.message = body.message?.trim();
  }

  if (body.locationName !== undefined) {
    payload.locationName = body.locationName?.trim() || "Regional";
  }

  if (body.category !== undefined) {
    payload.category = body.category?.trim() || "Advisory";
  }

  if (body.riskLevel !== undefined) {
    payload.riskLevel = sanitizeRiskLevel(body.riskLevel);
  }

  if (body.targetRoles !== undefined) {
    payload.targetRoles = sanitizeTargetRoles(body.targetRoles);
  }

  if (body.actionItems !== undefined) {
    payload.actionItems = sanitizeItems(body.actionItems);
  }

  if (body.isActive !== undefined) {
    payload.isActive = Boolean(body.isActive);
  }

  if (requireCoreFields && (!payload.title || !payload.message)) {
    throw new ApiError(400, "Title and message are required.");
  }

  return payload;
}

async function findHydratedAlert(alertId) {
  return Alert.findById(alertId).populate("createdBy", "name role");
}

function assertValidAlertId(alertId) {
  if (!mongoose.Types.ObjectId.isValid(alertId)) {
    throw new ApiError(400, "Invalid alert id.");
  }
}

export const listAlerts = asyncHandler(async (req, res) => {
  const isAdminManageView = req.user.role === "ADMIN" && req.query.scope === "manage";
  const limit = Math.min(Number(req.query.limit) || (isAdminManageView ? 50 : 20), 100);
  const filters = isAdminManageView
    ? {}
    : {
        isActive: true,
        targetRoles: { $in: [req.user.role, "ALL"] },
      };

  const alerts = await Alert.find(filters)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name role");

  res.json({
    alerts: alerts.map(serializeAlert),
    total: alerts.length,
  });
});

export const createAlert = asyncHandler(async (req, res) => {
  const payload = sanitizeAlertPayload(req.body, { requireCoreFields: true });

  const alert = await Alert.create({
    title: payload.title,
    message: payload.message,
    locationName: payload.locationName || "Regional",
    category: payload.category || "Advisory",
    riskLevel: payload.riskLevel || "MEDIUM",
    targetRoles: payload.targetRoles?.length ? payload.targetRoles : ["ALL"],
    actionItems: payload.actionItems || [],
    createdBy: req.user.id,
  });

  const hydratedAlert = await findHydratedAlert(alert._id);

  res.status(201).json({
    message: "Alert published successfully.",
    alert: serializeAlert(hydratedAlert),
  });
});

export const updateAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  assertValidAlertId(alertId);

  const alert = await Alert.findById(alertId);

  if (!alert) {
    throw new ApiError(404, "Alert not found.");
  }

  const payload = sanitizeAlertPayload(req.body);
  const nextTitle = payload.title ?? alert.title;
  const nextMessage = payload.message ?? alert.message;

  if (!nextTitle || !nextMessage) {
    throw new ApiError(400, "Title and message are required.");
  }

  alert.title = nextTitle;
  alert.message = nextMessage;
  alert.locationName = payload.locationName ?? alert.locationName;
  alert.category = payload.category ?? alert.category;
  alert.riskLevel = payload.riskLevel ?? alert.riskLevel;
  alert.targetRoles = payload.targetRoles?.length ? payload.targetRoles : payload.targetRoles ? ["ALL"] : alert.targetRoles;
  alert.actionItems = payload.actionItems ?? alert.actionItems;
  alert.isActive = payload.isActive ?? alert.isActive;

  await alert.save();

  const hydratedAlert = await findHydratedAlert(alertId);

  res.json({
    message: alert.isActive ? "Alert updated successfully." : "Alert deactivated successfully.",
    alert: serializeAlert(hydratedAlert),
  });
});

export const deleteAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  assertValidAlertId(alertId);

  const alert = await Alert.findById(alertId);

  if (!alert) {
    throw new ApiError(404, "Alert not found.");
  }

  await alert.deleteOne();

  res.json({
    message: "Alert deleted successfully.",
  });
});
