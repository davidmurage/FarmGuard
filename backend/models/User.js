import mongoose from "mongoose";
export const ROLES = ["FARMER", "VET", "ADMIN"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ROLES, default: "FARMER", index: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
