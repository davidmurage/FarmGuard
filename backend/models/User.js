import mongoose from "mongoose";

export const ROLES = ["FARMER", "VET", "ADMIN", "PARTNER"];
export const SELF_SIGNUP_ROLES = ["FARMER", "VET", "PARTNER"];

const notificationPreferencesSchema = new mongoose.Schema(
  {
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  { _id: false },
);

const userLocationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    county: { type: String, trim: true, default: "" },
    countyKey: { type: String, trim: true, default: "", index: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ROLES, default: "FARMER", index: true },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    location: {
      type: userLocationSchema,
      default: () => ({}),
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
