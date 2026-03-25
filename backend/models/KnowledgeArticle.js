import mongoose from "mongoose";

import { REPORT_TYPES } from "./Report.js";
import { ROLES } from "./User.js";

export const KNOWLEDGE_CATEGORIES = [
  "ZOONOTIC_DISEASE",
  "LIVESTOCK_HEALTH",
  "CROP_PROTECTION",
  "ENVIRONMENTAL_RISK",
  "SAFE_PRACTICES",
  "FIELD_RESPONSE",
];

const knowledgeArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: KNOWLEDGE_CATEGORIES,
      required: true,
      index: true,
    },
    audienceRoles: {
      type: [String],
      default: ["ALL"],
      index: true,
    },
    reportTypes: {
      type: [String],
      enum: REPORT_TYPES,
      default: [],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    actionItems: {
      type: [String],
      default: [],
    },
    bodySections: {
      type: [
        new mongoose.Schema(
          {
            heading: { type: String, required: true, trim: true },
            content: { type: String, required: true, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["SYSTEM", "ADMIN"],
      default: "SYSTEM",
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("KnowledgeArticle", knowledgeArticleSchema);
