import mongoose from "mongoose";

export const ALERT_CHANNELS = ["IN_APP", "SMS", "WHATSAPP"];
export const ALERT_DELIVERY_STATUSES = ["NOT_REQUESTED", "QUEUED", "PARTIAL", "FAILED"];

const deliveryStatsSchema = new mongoose.Schema(
  {
    eligible: { type: Number, default: 0, min: 0 },
    queued: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    skipped: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const deliverySummarySchema = new mongoose.Schema(
  {
    providerMode: { type: String, default: "", trim: true },
    audienceSize: { type: Number, default: 0, min: 0 },
    lastAttemptedAt: { type: Date, default: null },
    sms: { type: deliveryStatsSchema, default: () => ({}) },
    whatsapp: { type: deliveryStatsSchema, default: () => ({}) },
  },
  { _id: false },
);

const alertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    category: { type: String, default: "Advisory", trim: true },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    locationName: { type: String, default: "Regional", trim: true },
    targetRoles: { type: [String], default: ["ALL"], index: true },
    deliveryChannels: { type: [String], enum: ALERT_CHANNELS, default: ["IN_APP"] },
    deliveryStatus: {
      type: String,
      enum: ALERT_DELIVERY_STATUSES,
      default: "NOT_REQUESTED",
      index: true,
    },
    deliverySummary: { type: deliverySummarySchema, default: () => ({}) },
    actionItems: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Alert", alertSchema);
