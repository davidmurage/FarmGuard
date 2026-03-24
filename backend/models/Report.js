import mongoose from "mongoose";

export const REPORT_TYPES = ["LIVESTOCK", "CROP", "ENVIRONMENT"];
export const REPORT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const REPORT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "RESOLVED"];

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    severity: {
      type: String,
      enum: REPORT_SEVERITIES,
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "SUBMITTED",
      index: true,
    },
    source: {
      type: String,
      enum: ["FARMER_APP", "VET_APP", "API_IMPORT"],
      default: "FARMER_APP",
    },
    location: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      county: {
        type: String,
        default: "Unspecified",
        trim: true,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    review: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      diagnosis: {
        type: String,
        trim: true,
      },
      notes: {
        type: String,
        trim: true,
      },
      labResultSummary: {
        type: String,
        trim: true,
      },
      recommendedActions: {
        type: [String],
        default: [],
      },
      followUpDate: Date,
      reviewedAt: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Report", reportSchema);
