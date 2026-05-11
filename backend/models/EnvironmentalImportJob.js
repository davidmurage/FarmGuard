import mongoose from "mongoose";

import { ENVIRONMENTAL_SIGNAL_SOURCES } from "./EnvironmentalSignal.js";

export const ENVIRONMENTAL_IMPORT_FORMATS = ["CSV", "JSON"];
export const ENVIRONMENTAL_IMPORT_STATUSES = ["COMPLETED", "PARTIAL", "FAILED"];
export const ENVIRONMENTAL_IMPORT_JOB_TYPES = ["MANUAL_IMPORT", "PROVIDER_SYNC"];
export const ENVIRONMENTAL_IMPORT_TRIGGER_MODES = ["MANUAL", "SCHEDULED"];

const environmentalImportJobSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ENVIRONMENTAL_SIGNAL_SOURCES.filter((value) => value !== "MANUAL_ENTRY"),
      required: true,
      index: true,
    },
    importFormat: {
      type: String,
      enum: ENVIRONMENTAL_IMPORT_FORMATS,
      required: true,
    },
    providerName: {
      type: String,
      trim: true,
      default: "",
    },
    providerKey: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    jobType: {
      type: String,
      enum: ENVIRONMENTAL_IMPORT_JOB_TYPES,
      default: "MANUAL_IMPORT",
      index: true,
    },
    triggerMode: {
      type: String,
      enum: ENVIRONMENTAL_IMPORT_TRIGGER_MODES,
      default: "MANUAL",
    },
    status: {
      type: String,
      enum: ENVIRONMENTAL_IMPORT_STATUSES,
      required: true,
      index: true,
    },
    totalRecords: {
      type: Number,
      default: 0,
      min: 0,
    },
    importedRecords: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedRecords: {
      type: Number,
      default: 0,
      min: 0,
    },
    importedCounties: {
      type: [String],
      default: [],
    },
    errorSamples: {
      type: [String],
      default: [],
    },
    summaryMessage: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("EnvironmentalImportJob", environmentalImportJobSchema);
