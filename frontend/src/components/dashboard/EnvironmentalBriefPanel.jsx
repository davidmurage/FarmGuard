import { useState } from "react";

import { useEnvironmentalBriefData } from "../../lib/useEnvironmentalBriefData";

const DEFAULT_VISIBLE_COUNTIES = 6;

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRiskLabel(value) {
  return String(value || "environment").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatSourceType(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetric(value) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "--";
}

export default function EnvironmentalBriefPanel({
  title = "Environmental intelligence",
  description = "Python-backed ML scoring that combines weather-like signals with recent FarmGuard reports.",
  refreshToken = 0,
}) {
  const [showAllCounties, setShowAllCounties] = useState(false);
  const { data, isLoading, error } = useEnvironmentalBriefData(refreshToken);
  const rankedCounties = [...data.counties].sort((left, right) => (right.combinedRiskScore || 0) - (left.combinedRiskScore || 0));
  const hiddenCountyCount = Math.max(rankedCounties.length - DEFAULT_VISIBLE_COUNTIES, 0);
  const visibleCounties = showAllCounties ? rankedCounties : rankedCounties.slice(0, DEFAULT_VISIBLE_COUNTIES);
  const engineBannerClass =
    data.scoring.status === "online"
      ? "dashboard-banner dashboard-banner-info"
      : data.scoring.status === "empty"
        ? "dashboard-banner"
      : "dashboard-banner dashboard-banner-warning";

  return (
    <section className="dashboard-panel dashboard-panel-wide environmental-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}
      {!error ? (
        <div className={engineBannerClass}>
          <strong>{data.scoring.label}</strong>
          <span>
            {data.scoring.message}
            {data.scoring.modelVersion ? ` Model ${data.scoring.modelVersion}.` : ""}
            {data.scoring.trainingSamples ? ` Trained on ${data.scoring.trainingSamples} samples.` : ""}
            {typeof data.scoring.metrics?.accuracy === "number" ? ` Accuracy ${formatMetric(data.scoring.metrics.accuracy)}.` : ""}
          </span>
        </div>
      ) : null}

      <div className="environmental-summary-grid">
        <article className="environmental-summary-card">
          <span>Counties watched</span>
          <strong>{data.summary.countyCount}</strong>
          <small>{data.signalWindowDays}-day signal window</small>
        </article>
        <article className="environmental-summary-card">
          <span>High-risk counties</span>
          <strong>{data.summary.highRiskCount}</strong>
          <small>High or critical environmental pressure</small>
        </article>
        <article className="environmental-summary-card">
          <span>Linked report counties</span>
          <strong>{data.summary.reportLinkedCount}</strong>
          <small>Environmental pressure overlapping with field reports</small>
        </article>
        <article className="environmental-summary-card">
          <span>Avg vegetation index</span>
          <strong>{formatScore(data.summary.averageVegetationIndex)}</strong>
          <small>Lower values suggest crop or pasture stress</small>
        </article>
        <article className="environmental-summary-card">
          <span>Avg risk probability</span>
          <strong>{formatScore(data.summary.averageRiskProbabilityPct)}%</strong>
          <small>ML-estimated outbreak likelihood across tracked counties</small>
        </article>
      </div>

      {rankedCounties.length ? (
        <>
          <div className="environmental-brief-toolbar">
            <p className="compact-panel-meta">
              {showAllCounties
                ? `Showing all ${rankedCounties.length} counties by current combined risk score.`
                : `Showing the top ${visibleCounties.length} counties by current combined risk score first.`}
            </p>
            {hiddenCountyCount ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAllCounties((current) => !current)}
              >
                {showAllCounties ? "Show priority counties" : `Show all ${rankedCounties.length}`}
              </button>
            ) : null}
          </div>

          <div className={`environmental-brief-list ${showAllCounties ? "environmental-brief-list-expanded" : ""}`}>
            {visibleCounties.map((county) => (
            <article key={county.county} className="environmental-brief-card">
              <div className="environmental-brief-head">
                <div>
                  <h3>{county.county}</h3>
                  <p>{county.narrative}</p>
                </div>
                <div className="environmental-brief-score">
                  <span className={`risk-badge risk-badge-${county.band.toLowerCase()}`}>{county.band}</span>
                  <strong>{formatScore(county.combinedRiskScore)}</strong>
                </div>
              </div>

              <div className="environmental-stat-grid">
                <div>
                  <span>Dominant risk</span>
                  <strong>{formatRiskLabel(county.dominantRisk)}</strong>
                </div>
                <div>
                  <span>Rainfall</span>
                  <strong>{formatScore(county.environmental.rainfallMm)} mm</strong>
                </div>
                <div>
                  <span>Humidity</span>
                  <strong>{formatScore(county.environmental.humidityPct)}%</strong>
                </div>
                <div>
                  <span>Temperature</span>
                  <strong>{formatScore(county.environmental.temperatureC)} C</strong>
                </div>
                <div>
                  <span>Vegetation</span>
                  <strong>{formatScore(county.environmental.vegetationIndex)}</strong>
                </div>
                <div>
                  <span>Linked reports</span>
                  <strong>{county.reportPressure.totalReports}</strong>
                </div>
                <div>
                  <span>Risk probability</span>
                  <strong>{formatScore(county.riskProbabilityPct)}%</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{formatScore(county.confidencePct)}%</strong>
                </div>
              </div>

              <div className="environmental-chip-row">
                {(county.modelDrivers?.length ? county.modelDrivers : county.drivers).map((driver) => (
                  <span key={`${county.county}-${driver.code}`} className="knowledge-chip knowledge-chip-soft">
                    {driver.label}
                  </span>
                ))}
              </div>

              <ul className="inline-list">
                {county.recommendedActions.map((action) => (
                  <li key={`${county.county}-${action}`}>{action}</li>
                ))}
              </ul>

              <div className="meta-row">
                <span>{county.signalCount} signals</span>
                <span>{county.sourceTypes.map(formatSourceType).join(", ")}</span>
                <span>{data.scoring.status === "online" ? "ML scored" : "Heuristic fallback"}</span>
                <span>Latest {formatDate(county.latestCapturedAt)}</span>
              </div>
            </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">No environmental signals have been logged yet. Add county conditions first to generate early-warning recommendations.</div>
      )}

      {isLoading ? <div className="dashboard-banner">Refreshing environmental intelligence...</div> : null}
    </section>
  );
}
