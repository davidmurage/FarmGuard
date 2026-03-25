function escapeCsvCell(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

function buildCsvLines(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createSinglePagePdf(lines) {
  const visibleLines = lines.slice(0, 42);
  const contentStream = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...visibleLines.map((line, index) => (index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`)),
    "ET",
  ].join("\n");

  const streamBytes = Buffer.byteLength(contentStream, "utf8");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${streamBytes} >> stream\n${contentStream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function buildAnalyticsCsv(exportView) {
  const rows = [
    ["FarmGuard Analytics Export"],
    ["Audience", exportView.audience],
    ["Generated At", exportView.generatedAt],
    ["Reporting Window", exportView.rangeLabel],
    ["Confidentiality", exportView.confidentialityNote],
    [],
    ["Totals"],
    ["Metric", "Value"],
    ["Total reports", exportView.totals.totalReports],
    ["High-risk reports", exportView.totals.highRiskReports],
    ["Verified reports", exportView.totals.verifiedReports],
    ["Resolved reports", exportView.totals.resolvedReports],
    ["Active alerts", exportView.totals.activeAlertCount],
    ["Verification rate", `${Math.round(exportView.totals.verificationRate)}%`],
    ["Resolution rate", `${Math.round(exportView.totals.resolutionRate)}%`],
    [],
    ["Trend Summary"],
    ["Period", "Total reports", "High-risk", "Verified", "Resolved"],
    ...exportView.trendBuckets.map((bucket) => [
      bucket.label,
      bucket.totalReports,
      bucket.highRiskReports,
      bucket.verifiedReports,
      bucket.resolvedReports,
    ]),
    [],
    ["Top Counties"],
    ["County", "Reports", "High-risk", "Verified"],
    ...exportView.topCounties.map((county) => [
      county.county,
      county.reportCount,
      county.highRiskReports,
      county.verifiedReports,
    ]),
  ];

  if (exportView.audience === "admin") {
    rows.push(
      [],
      ["Recent Highlights"],
      ["Title", "County", "Type", "Severity", "Status", "Created At"],
      ...exportView.recentHighlights.map((item) => [
        item.title,
        item.county,
        item.reportType,
        item.severity,
        item.status,
        item.createdAt,
      ]),
    );
  } else {
    rows.push(
      [],
      ["Recent Aggregated Signals"],
      ["County", "Type", "Severity", "Status", "Created At"],
      ...exportView.recentHighlights.map((item) => [
        item.county,
        item.reportType,
        item.severity,
        item.status,
        item.createdAt,
      ]),
    );
  }

  rows.push(
    [],
    ["Insights"],
    ...exportView.insights.map((insight) => [insight]),
  );

  return buildCsvLines(rows);
}

export function buildAnalyticsPdf(exportView) {
  const lines = [
    "FarmGuard Analytics Export",
    `Audience: ${exportView.audience}`,
    `Generated: ${exportView.generatedAt}`,
    `Window: ${exportView.rangeLabel}`,
    exportView.confidentialityNote,
    "",
    `Total reports: ${exportView.totals.totalReports}`,
    `High-risk reports: ${exportView.totals.highRiskReports}`,
    `Verified reports: ${exportView.totals.verifiedReports}`,
    `Resolved reports: ${exportView.totals.resolvedReports}`,
    `Active alerts: ${exportView.totals.activeAlertCount}`,
    `Verification rate: ${Math.round(exportView.totals.verificationRate)}%`,
    `Resolution rate: ${Math.round(exportView.totals.resolutionRate)}%`,
    "",
    "Trend summary:",
    ...exportView.trendBuckets.slice(0, 8).map(
      (bucket) =>
        `${bucket.label}: ${bucket.totalReports} reports, ${bucket.highRiskReports} high-risk, ${bucket.verifiedReports} verified`,
    ),
    "",
    "Top counties:",
    ...exportView.topCounties.slice(0, 5).map(
      (county) =>
        `${county.county}: ${county.reportCount} reports, ${county.highRiskReports} high-risk, ${county.verifiedReports} verified`,
    ),
    "",
    "Insights:",
    ...exportView.insights.map((insight) => `- ${insight}`),
  ];

  return createSinglePagePdf(lines);
}
