import mongoose from "mongoose";

export const ALERT_CHANNELS = ["IN_APP", "SMS", "WHATSAPP"];
export const ALERT_DELIVERY_STATUSES = ["NOT_REQUESTED", "QUEUED", "PARTIAL", "FAILED"];
export const ALERT_SOURCE_KINDS = ["MANUAL", "AUTO_REPORT_CLUSTER"];

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

const signalSummarySchema = new mongoose.Schema(
  {
    county: { type: String, default: "", trim: true },
    reportType: { type: String, default: "", trim: true },
    reportCount: { type: Number, default: 0, min: 0 },
    highRiskCount: { type: Number, default: 0, min: 0 },
    verifiedCount: { type: Number, default: 0, min: 0 },
    dominantSignals: { type: [String], default: [] },
    combinedRiskScore: { type: Number, default: 0, min: 0 },
    detectionWindowDays: { type: Number, default: 14, min: 1 },
    latestReportAt: { type: Date, default: null },
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
    targetCounties: { type: [String], default: [] },
    targetCountyKeys: { type: [String], default: [], index: true },
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
    sourceKind: {
      type: String,
      enum: ALERT_SOURCE_KINDS,
      default: "MANUAL",
      index: true,
    },
    sourceKey: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    signalSummary: {
      type: signalSummarySchema,
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true },
);

alertSchema.index(
  { sourceKind: 1, sourceKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceKind: "AUTO_REPORT_CLUSTER",
      sourceKey: { $type: "string", $gt: "" },
    },
  },
);

export default mongoose.model("Alert", alertSchema);
