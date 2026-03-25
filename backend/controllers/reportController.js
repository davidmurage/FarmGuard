import mongoose from "mongoose";

import Report, { REPORT_SEVERITIES, REPORT_STATUSES, REPORT_TYPES } from "../models/Report.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeReport } from "../utils/serializers.js";

function sanitizeSymptoms(symptoms) {
  if (!Array.isArray(symptoms)) {
    return [];
  }

  return symptoms.map((symptom) => String(symptom).trim()).filter(Boolean);
}

function sanitizeCoordinates(latitude, longitude) {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return undefined;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function sanitizeReviewActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.map((action) => String(action).trim()).filter(Boolean);
}

function assertEditableFarmerReport(report, userId) {
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  if (String(report.reporter) !== String(userId)) {
    throw new ApiError(403, "You can only manage your own reports.");
  }

  if (report.status !== "SUBMITTED" || report.review?.reviewedAt) {
    throw new ApiError(409, "Only submitted reports without vet review can be edited or deleted.");
  }
}

export const createReport = asyncHandler(async (req, res) => {
  const reportType = req.body.reportType;
  const title = req.body.title?.trim();
  const description = req.body.description?.trim();
  const locationName = req.body.locationName?.trim();
  const county = req.body.county?.trim() || "Unspecified";
  const severity = REPORT_SEVERITIES.includes(req.body.severity) ? req.body.severity : "MEDIUM";
  const symptoms = sanitizeSymptoms(req.body.symptoms);

  if (!REPORT_TYPES.includes(reportType)) {
    throw new ApiError(400, "A valid report type is required.");
  }

  if (!title || !description || !locationName) {
    throw new ApiError(400, "Title, description and location are required.");
  }

  const report = await Report.create({
    reporter: req.user.id,
    reportType,
    title,
    description,
    severity,
    symptoms,
    source: req.user.role === "VET" ? "VET_APP" : "FARMER_APP",
    status: req.user.role === "FARMER" ? "SUBMITTED" : "UNDER_REVIEW",
    location: {
      name: locationName,
      county,
      coordinates: sanitizeCoordinates(req.body.latitude, req.body.longitude),
    },
  });

  const hydratedReport = await Report.findById(report._id)
    .populate("reporter", "name email role")
    .populate("review.reviewedBy", "name email role");

  res.status(201).json({
    message: "Report submitted successfully.",
    report: serializeReport(hydratedReport),
  });
});

export const listReports = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const filters = {};

  if (req.user.role === "FARMER") {
    filters.reporter = req.user.id;
  }

  if (REPORT_TYPES.includes(req.query.reportType)) {
    filters.reportType = req.query.reportType;
  }

  if (REPORT_STATUSES.includes(req.query.status)) {
    filters.status = req.query.status;
  }

  if (REPORT_SEVERITIES.includes(req.query.severity)) {
    filters.severity = req.query.severity;
  }

  const reports = await Report.find(filters)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reporter", "name email role")
    .populate("review.reviewedBy", "name email role");

  res.json({
    reports: reports.map(serializeReport),
    total: reports.length,
  });
});

export const updateReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid report id.");
  }

  const report = await Report.findById(reportId);
  assertEditableFarmerReport(report, req.user.id);

  const nextReportType = REPORT_TYPES.includes(req.body.reportType) ? req.body.reportType : report.reportType;
  const nextTitle = req.body.title !== undefined ? req.body.title?.trim() : report.title;
  const nextDescription = req.body.description !== undefined ? req.body.description?.trim() : report.description;
  const nextLocationName = req.body.locationName !== undefined ? req.body.locationName?.trim() : report.location.name;
  const nextCounty = req.body.county !== undefined ? req.body.county?.trim() || "Unspecified" : report.location.county;
  const nextSeverity = REPORT_SEVERITIES.includes(req.body.severity) ? req.body.severity : report.severity;
  const nextSymptoms = Array.isArray(req.body.symptoms) ? sanitizeSymptoms(req.body.symptoms) : report.symptoms;
  const nextCoordinates = req.body.latitude !== undefined || req.body.longitude !== undefined
    ? sanitizeCoordinates(req.body.latitude, req.body.longitude)
    : report.location.coordinates;

  if (!nextTitle || !nextDescription || !nextLocationName) {
    throw new ApiError(400, "Title, description and location are required.");
  }

  report.reportType = nextReportType;
  report.title = nextTitle;
  report.description = nextDescription;
  report.severity = nextSeverity;
  report.symptoms = nextSymptoms;
  report.location = {
    name: nextLocationName,
    county: nextCounty,
    coordinates: nextCoordinates,
  };

  await report.save();

  const hydratedReport = await Report.findById(reportId)
    .populate("reporter", "name email role")
    .populate("review.reviewedBy", "name email role");

  res.json({
    message: "Report updated successfully.",
    report: serializeReport(hydratedReport),
  });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid report id.");
  }

  const report = await Report.findById(reportId);
  assertEditableFarmerReport(report, req.user.id);
  await report.deleteOne();

  res.json({
    message: "Report deleted successfully.",
  });
});

export const reviewReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid report id.");
  }

  const report = await Report.findById(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  const requestedStatus = req.body.status;
  const allowedStatuses = ["UNDER_REVIEW", "VERIFIED", "RESOLVED"];
  const safeStatus = allowedStatuses.includes(requestedStatus) ? requestedStatus : null;
  const diagnosis = req.body.diagnosis?.trim();
  const notes = req.body.notes?.trim();
  const labResultSummary = req.body.labResultSummary?.trim();
  const recommendedActions = sanitizeReviewActions(req.body.recommendedActions);
  const followUpDate = req.body.followUpDate ? new Date(req.body.followUpDate) : null;

  if (!safeStatus && !diagnosis && !notes && !labResultSummary && !recommendedActions.length && !followUpDate) {
    throw new ApiError(400, "Add at least one review update before submitting.");
  }

  report.status = safeStatus || (report.status === "SUBMITTED" ? "UNDER_REVIEW" : report.status);
  report.review = {
    ...report.review,
    reviewedBy: req.user.id,
    diagnosis: diagnosis ?? report.review?.diagnosis ?? "",
    notes: notes ?? report.review?.notes ?? "",
    labResultSummary: labResultSummary ?? report.review?.labResultSummary ?? "",
    recommendedActions: recommendedActions.length ? recommendedActions : report.review?.recommendedActions ?? [],
    followUpDate: followUpDate && !Number.isNaN(followUpDate.getTime()) ? followUpDate : report.review?.followUpDate ?? null,
    reviewedAt: new Date(),
  };

  await report.save();

  const hydratedReport = await Report.findById(reportId)
    .populate("reporter", "name email role")
    .populate("review.reviewedBy", "name email role");

  res.json({
    message: "Report review saved successfully.",
    report: serializeReport(hydratedReport),
  });
});
