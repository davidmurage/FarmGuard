import Alert from "../models/Alert.js";
import { ROLES } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeAlert } from "../utils/serializers.js";

const ALERT_AUDIENCES = [...ROLES, "ALL"];

function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => String(item).trim()).filter(Boolean);
}

export const listActiveAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.find({
    isActive: true,
    targetRoles: { $in: [req.user.role, "ALL"] },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("createdBy", "name role");

  res.json({
    alerts: alerts.map(serializeAlert),
    total: alerts.length,
  });
});

export const createAlert = asyncHandler(async (req, res) => {
  const title = req.body.title?.trim();
  const message = req.body.message?.trim();
  const locationName = req.body.locationName?.trim() || "Regional";
  const category = req.body.category?.trim() || "Advisory";
  const riskLevel = req.body.riskLevel?.trim() || "MEDIUM";
  const targetRoles = sanitizeItems(req.body.targetRoles).filter((role) => ALERT_AUDIENCES.includes(role));
  const actionItems = sanitizeItems(req.body.actionItems);

  if (!title || !message) {
    throw new ApiError(400, "Title and message are required.");
  }

  const alert = await Alert.create({
    title,
    message,
    locationName,
    category,
    riskLevel,
    targetRoles: targetRoles.length ? targetRoles : ["ALL"],
    actionItems,
    createdBy: req.user.id,
  });

  const hydratedAlert = await Alert.findById(alert._id).populate("createdBy", "name role");

  res.status(201).json({
    message: "Alert published successfully.",
    alert: serializeAlert(hydratedAlert),
  });
});
