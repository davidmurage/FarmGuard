import mongoose from "mongoose";

export const ALERT_DELIVERY_CHANNELS = ["SMS", "WHATSAPP"];
export const ALERT_DELIVERY_LOG_STATUSES = ["QUEUED", "FAILED", "SKIPPED"];

const alertDeliverySchema = new mongoose.Schema(
  {
    alert: { type: mongoose.Schema.Types.ObjectId, ref: "Alert", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: String, enum: ALERT_DELIVERY_CHANNELS, required: true, index: true },
    status: { type: String, enum: ALERT_DELIVERY_LOG_STATUSES, required: true, index: true },
    providerMode: { type: String, default: "", trim: true },
    provider: { type: String, default: "", trim: true },
    providerStatus: { type: String, default: "", trim: true },
    recipientAddress: { type: String, default: "", trim: true },
    providerMessageSid: { type: String, default: "", trim: true },
    errorMessage: { type: String, default: "", trim: true },
    attemptedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

alertDeliverySchema.index({ alert: 1, user: 1, channel: 1 }, { unique: true });

export default mongoose.model("AlertDelivery", alertDeliverySchema);
