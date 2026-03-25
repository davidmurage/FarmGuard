import { useState } from "react";

import { apiDownload, extractApiErrorMessage } from "../../lib/api";
import { useAnalyticsData } from "../../lib/useAnalyticsData";

const INTERVAL_OPTIONS = {
  monthly: [3, 6, 9, 12],
  quarterly: [2, 4, 6, 8],
};

const DEFAULT_AUDIENCE_OPTIONS = [
  { value: "admin", label: "Internal admin" },
  { value: "partner", label: "Partner organization" },
];

function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

function formatDateTime(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildExportPath({ format, period, intervals, audience }) {
  const query = new URLSearchParams({
    period,
    intervals: String(intervals),
    audience,
  });

  return `/api/analytics/export/${format}?${query.toString()}`;
}

export default function AnalyticsPanel({
  title = "Reporting and analytics",
  description = "Track outbreak trends, review reporting windows, and export internal or partner-ready summaries.",
  defaultAudience = "admin",
  audienceOptions = DEFAULT_AUDIENCE_OPTIONS,
  reportLabel = "outbreak report",
}) {
  const normalizedAudienceOptions = audienceOptions.length ? audienceOptions : DEFAULT_AUDIENCE_OPTIONS;
  const initialAudience = normalizedAudienceOptions.some((option) => option.value === defaultAudience)
    ? defaultAudience
    : normalizedAudienceOptions[0].value;
  const [period, setPeriod] = useState("monthly");
  const [intervals, setIntervals] = useState(6);
  const [audience, setAudience] = useState(initialAudience);
  const [exportMessage, setExportMessage] = useState("");
  const [exportingFormat, setExportingFormat] = useState("");
  const { data, isLoading, error } = useAnalyticsData({ period, intervals });
  const maxTrendValue = Math.max(1, ...data.trendBuckets.map((bucket) => bucket.totalReports));

  const onPeriodChange = (event) => {
    const nextPeriod = event.target.value;
    const nextIntervals = INTERVAL_OPTIONS[nextPeriod][1] || INTERVAL_OPTIONS[nextPeriod][0];

    setPeriod(nextPeriod);
    setIntervals(nextIntervals);
  };

  const downloadExport = async (format) => {
    setExportingFormat(format);
    setExportMessage("");

    try {
      const result = await apiDownload(
        buildExportPath({ format, period, intervals, audience }),
        {
          auth: true,
          filename: `farmguard-${period}-${audience}-report.${format}`,
        },
      );

      setExportMessage(`${format.toUpperCase()} report downloaded: ${result.filename}`);
    } catch (downloadError) {
      setExportMessage(extractApiErrorMessage(downloadError, "Unable to export analytics report."));
    } finally {
      setExportingFormat("");
    }
  };

  return (
    <section className="dashboard-panel dashboard-panel-wide analytics-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <div className={`analytics-control-row ${normalizedAudienceOptions.length > 1 ? "" : "analytics-control-row-compact"}`}>
        <label>
          <span>Reporting period</span>
          <select className="input select" value={period} onChange={onPeriodChange}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </label>

        <label>
          <span>Window size</span>
          <select className="input select" value={intervals} onChange={(event) => setIntervals(Number(event.target.value))}>
            {INTERVAL_OPTIONS[period].map((option) => (
              <option key={option} value={option}>
                {option} {period === "monthly" ? "months" : "quarters"}
              </option>
            ))}
          </select>
        </label>

        {normalizedAudienceOptions.length > 1 ? (
          <label>
            <span>Export audience</span>
            <select className="input select" value={audience} onChange={(event) => setAudience(event.target.value)}>
              {normalizedAudienceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <section className="analytics-report-head">
        <div>
          <h3>{period === "monthly" ? `Monthly ${reportLabel}` : `Quarterly ${reportLabel}`}</h3>
          <p>
            Generated {formatDateTime(data.generatedAt)}. Viewing {data.rangeLabel || "the selected reporting window"}.
          </p>
        </div>

        <div className="analytics-export-row">
          <span className="analytics-export-note">
            {audience === "partner"
              ? "Partner exports are anonymized for safer external sharing."
              : "Admin exports include operational highlights for internal coordination."}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={exportingFormat === "csv"}
            onClick={() => downloadExport("csv")}
          >
            {exportingFormat === "csv" ? "Preparing CSV..." : "Export CSV"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={exportingFormat === "pdf"}
            onClick={() => downloadExport("pdf")}
          >
            {exportingFormat === "pdf" ? "Preparing PDF..." : "Export PDF"}
          </button>
        </div>
      </section>

      <section className="analytics-summary-grid">
        <article className="analytics-summary-card">
          <span>Total reports</span>
          <strong>{data.totals.totalReports}</strong>
          <small>{data.rangeLabel || "Current reporting window"}</small>
        </article>
        <article className="analytics-summary-card">
          <span>High-risk share</span>
          <strong>{formatPercent(data.totals.highRiskRate)}</strong>
          <small>{data.totals.highRiskReports} high-risk reports</small>
        </article>
        <article className="analytics-summary-card">
          <span>Verification rate</span>
          <strong>{formatPercent(data.totals.verificationRate)}</strong>
          <small>{data.totals.verifiedReports} verified reports</small>
        </article>
        <article className="analytics-summary-card">
          <span>Resolution rate</span>
          <strong>{formatPercent(data.totals.resolutionRate)}</strong>
          <small>{data.totals.resolvedReports} resolved reports</small>
        </article>
      </section>

      <section className="analytics-trend-layout">
        <article className="analytics-breakdown-card analytics-trend-card">
          <div className="analytics-card-head">
            <div>
              <h3>Trend summary</h3>
              <p>Each column shows total reports with the high-risk portion highlighted.</p>
            </div>
            <span className="analytics-muted">Active alerts: {data.totals.activeAlertCount}</span>
          </div>

          {data.trendBuckets.length ? (
            <div className="analytics-chart">
              {data.trendBuckets.map((bucket) => {
                const totalHeight = Math.max(16, (bucket.totalReports / maxTrendValue) * 180);
                const riskHeight = bucket.totalReports
                  ? Math.max(10, (bucket.highRiskReports / maxTrendValue) * 180)
                  : 0;

                return (
                  <article key={bucket.key} className="analytics-trend-column">
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-shell" style={{ height: `${totalHeight}px` }}>
                        {riskHeight ? (
                          <i
                            className="analytics-bar-risk"
                            style={{ height: `${Math.min(riskHeight, totalHeight)}px` }}
                          />
                        ) : null}
                      </div>
                    </div>
                    <strong className="analytics-trend-value">{bucket.totalReports}</strong>
                    <span className="analytics-trend-label">{bucket.label}</span>
                    <span className="analytics-trend-meta">
                      {bucket.highRiskReports} high-risk
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No reports are available for the selected reporting window yet.</div>
          )}
        </article>

        <article className="analytics-breakdown-card">
          <div className="analytics-card-head">
            <div>
              <h3>Key insights</h3>
              <p>Generated summary notes for briefing and planning.</p>
            </div>
          </div>

          {data.insights.length ? (
            <ul className="analytics-insight-list">
              {data.insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Insights will appear once the platform has report activity to analyze.</div>
          )}
        </article>
      </section>

      <section className="analytics-breakdown-grid">
        <article className="analytics-breakdown-card">
          <div className="analytics-card-head">
            <div>
              <h3>Report types</h3>
              <p>See which signal category is driving the current outbreak view.</p>
            </div>
          </div>

          <div className="analytics-list">
            {data.reportTypeBreakdown.map((entry) => (
              <div key={entry.type} className="analytics-list-row">
                <div>
                  <strong>{formatLabel(entry.type)}</strong>
                  <div className="analytics-meter">
                    <i
                      style={{
                        width: `${data.totals.totalReports ? (entry.count / data.totals.totalReports) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span>{entry.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="analytics-breakdown-card">
          <div className="analytics-card-head">
            <div>
              <h3>Severity and status</h3>
              <p>Balance incoming risk against how much of it has already been validated or resolved.</p>
            </div>
          </div>

          <div className="analytics-stat-columns">
            <div className="analytics-list">
              {data.severityBreakdown.map((entry) => (
                <div key={entry.severity} className="analytics-list-row">
                  <strong>{formatLabel(entry.severity)}</strong>
                  <span className={`risk-badge risk-badge-${entry.severity.toLowerCase()}`}>{entry.count}</span>
                </div>
              ))}
            </div>

            <div className="analytics-list">
              {data.statusBreakdown.map((entry) => (
                <div key={entry.status} className="analytics-list-row">
                  <strong>{formatLabel(entry.status)}</strong>
                  <span>{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="analytics-breakdown-card">
          <div className="analytics-card-head">
            <div>
              <h3>Top counties</h3>
              <p>Prioritize operational follow-up where signals are clustering most.</p>
            </div>
          </div>

          {data.topCounties.length ? (
            <div className="analytics-highlight-list">
              {data.topCounties.map((county) => (
                <article key={county.county} className="analytics-highlight-card">
                  <div className="stack-item-row">
                    <strong>{county.county}</strong>
                    <span>{county.reportCount} reports</span>
                  </div>
                  <p>
                    {county.highRiskReports} high-risk and {county.verifiedReports} verified in the selected window.
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">County hotspots will appear once location-based reports arrive.</div>
          )}
        </article>

        <article className="analytics-breakdown-card">
          <div className="analytics-card-head">
            <div>
              <h3>Recent highlights</h3>
              <p>Latest operational signals included in the current reporting window.</p>
            </div>
          </div>

          {data.recentHighlights.length ? (
            <div className="analytics-highlight-list">
              {data.recentHighlights.map((item) => (
                <article key={item.id} className="analytics-highlight-card">
                  <div className="stack-item-row">
                    <strong>{item.title || `${formatLabel(item.reportType)} signal`}</strong>
                    <span className={`risk-badge risk-badge-${item.severity.toLowerCase()}`}>{formatLabel(item.severity)}</span>
                  </div>
                  <p>
                    {item.county} | {formatLabel(item.reportType)} | {formatLabel(item.status)}
                  </p>
                  <span className="analytics-muted">{formatDateTime(item.createdAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Recent operational highlights will appear as new reports are submitted.</div>
          )}
        </article>
      </section>

      {exportMessage ? <div className="dashboard-banner">{exportMessage}</div> : null}
      {isLoading ? <div className="dashboard-banner">Refreshing analytics report...</div> : null}
    </section>
  );
}
