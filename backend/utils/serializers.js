export function serializeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
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
    actionItems: source.actionItems || [],
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
  };
}
