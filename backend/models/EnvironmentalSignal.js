import mongoose from "mongoose";

export const ENVIRONMENTAL_SIGNAL_SOURCES = ["MANUAL_ENTRY", "WEATHER_FEED", "SATELLITE_FEED", "GOV_UPLOAD"];

const environmentalSignalSchema = new mongoose.Schema(
  {
    county: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    locationName: {
      type: String,
      default: "Regional",
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ENVIRONMENTAL_SIGNAL_SOURCES,
      default: "MANUAL_ENTRY",
      index: true,
    },
    rainfallMm: {
      type: Number,
      default: 0,
      min: 0,
    },
    humidityPct: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    temperatureC: {
      type: Number,
      default: 0,
    },
    vegetationIndex: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    soilMoisturePct: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      trim: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("EnvironmentalSignal", environmentalSignalSchema);
