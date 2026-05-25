export function serializeUser(user) {
  const source = user.toObject ? user.toObject() : user;

  return {
    id: String(source._id),
    name: source.name,
    email: source.email,
    role: source.role,
    phoneNumber: source.phoneNumber || "",
    location: {
      name: source.location?.name || "",
      county: source.location?.county || "",
    },
    notificationPreferences: {
      sms: source.notificationPreferences?.sms ?? true,
      whatsapp: source.notificationPreferences?.whatsapp ?? false,
      inApp: source.notificationPreferences?.inApp ?? true,
    },
  };
}

export function serializeReport(report) {
  const source = report.toObject ? report.toObject() : report;

  return {
    id: String(source._id),
    reportType: source.reportType,
    title: source.title,
    description: source.description,
    symptoms: source.symptoms || [],
    severity: source.severity,
    status: source.status,
    source: source.source,
    location: source.location,
    reporter: source.reporter?.name
      ? {
          id: String(source.reporter._id),
          name: source.reporter.name,
          email: source.reporter.email,
          role: source.reporter.role,
        }
      : source.reporter
        ? { id: String(source.reporter) }
        : null,
    review: source.review
      ? {
          diagnosis: source.review.diagnosis || "",
          notes: source.review.notes || "",
          labResultSummary: source.review.labResultSummary || "",
          recommendedActions: source.review.recommendedActions || [],
          followUpDate: source.review.followUpDate || null,
          reviewedAt: source.review.reviewedAt || null,
          reviewedBy: source.review.reviewedBy?.name
            ? {
                id: String(source.review.reviewedBy._id),
                name: source.review.reviewedBy.name,
                email: source.review.reviewedBy.email,
                role: source.review.reviewedBy.role,
              }
            : source.review.reviewedBy
              ? { id: String(source.review.reviewedBy) }
              : null,
        }
      : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeDeliveryBucket(bucket) {
  return {
    eligible: bucket?.eligible || 0,
    queued: bucket?.queued || 0,
    failed: bucket?.failed || 0,
    skipped: bucket?.skipped || 0,
  };
}

export function serializeAlert(alert) {
  const source = alert.toObject ? alert.toObject() : alert;

  return {
    id: String(source._id),
    title: source.title,
    message: source.message,
    category: source.category,
    riskLevel: source.riskLevel,
    locationName: source.locationName,
    targetRoles: source.targetRoles || [],
    targetCounties: source.targetCounties || [],
    deliveryChannels: source.deliveryChannels || ["IN_APP"],
    deliveryStatus: source.deliveryStatus || "NOT_REQUESTED",
    deliverySummary: {
      providerMode: source.deliverySummary?.providerMode || "",
      audienceSize: source.deliverySummary?.audienceSize || 0,
      lastAttemptedAt: source.deliverySummary?.lastAttemptedAt || null,
      sms: serializeDeliveryBucket(source.deliverySummary?.sms),
      whatsapp: serializeDeliveryBucket(source.deliverySummary?.whatsapp),
    },
    actionItems: source.actionItems || [],
    isActive: Boolean(source.isActive),
    sourceKind: source.sourceKind || "MANUAL",
    sourceKey: source.sourceKey || "",
    signalSummary: {
      county: source.signalSummary?.county || "",
      reportType: source.signalSummary?.reportType || "",
      reportCount: source.signalSummary?.reportCount || 0,
      highRiskCount: source.signalSummary?.highRiskCount || 0,
      verifiedCount: source.signalSummary?.verifiedCount || 0,
      dominantSignals: source.signalSummary?.dominantSignals || [],
      combinedRiskScore: source.signalSummary?.combinedRiskScore || 0,
      detectionWindowDays: source.signalSummary?.detectionWindowDays || 0,
      latestReportAt: source.signalSummary?.latestReportAt || null,
    },
    createdBy: source.createdBy?.name
      ? {
          id: String(source.createdBy._id),
          name: source.createdBy.name,
          role: source.createdBy.role,
        }
      : source.createdBy
        ? { id: String(source.createdBy) }
        : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export function serializeEnvironmentalSignal(signal) {
  const source = signal.toObject ? signal.toObject() : signal;

  return {
    id: String(source._id),
    county: source.county,
    locationName: source.locationName,
    sourceType: source.sourceType,
    providerKey: source.providerKey || "",
    rainfallMm: source.rainfallMm,
    humidityPct: source.humidityPct,
    temperatureC: source.temperatureC,
    vegetationIndex: source.vegetationIndex,
    soilMoisturePct: source.soilMoisturePct,
    notes: source.notes || "",
    capturedAt: source.capturedAt,
    createdBy: source.createdBy?.name
      ? {
          id: String(source.createdBy._id),
          name: source.createdBy.name,
          role: source.createdBy.role,
        }
      : source.createdBy
        ? { id: String(source.createdBy) }
        : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export function serializeEnvironmentalImportJob(importJob) {
  const source = importJob.toObject ? importJob.toObject() : importJob;

  return {
    id: String(source._id),
    sourceType: source.sourceType,
    importFormat: source.importFormat,
    providerName: source.providerName || "",
    providerKey: source.providerKey || "",
    jobType: source.jobType || "MANUAL_IMPORT",
    triggerMode: source.triggerMode || "MANUAL",
    status: source.status,
    totalRecords: source.totalRecords,
    importedRecords: source.importedRecords,
    failedRecords: source.failedRecords,
    importedCounties: source.importedCounties || [],
    errorSamples: source.errorSamples || [],
    summaryMessage: source.summaryMessage || "",
    createdBy: source.createdBy?.name
      ? {
          id: String(source.createdBy._id),
          name: source.createdBy.name,
          role: source.createdBy.role,
        }
      : source.createdBy
        ? { id: String(source.createdBy) }
        : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export function serializeKnowledgeArticle(article) {
  const source = article.toObject ? article.toObject() : article;

  return {
    id: String(source._id),
    title: source.title,
    slug: source.slug,
    summary: source.summary,
    category: source.category,
    audienceRoles: source.audienceRoles || [],
    reportTypes: source.reportTypes || [],
    tags: source.tags || [],
    actionItems: source.actionItems || [],
    bodySections: source.bodySections || [],
    featured: Boolean(source.featured),
    source: source.source,
    publishedBy: source.publishedBy?.name
      ? {
          id: String(source.publishedBy._id),
          name: source.publishedBy.name,
          email: source.publishedBy.email,
          role: source.publishedBy.role,
        }
      : source.publishedBy
        ? { id: String(source.publishedBy) }
        : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}
