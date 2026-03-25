import { useState } from "react";

import { useRiskMapData } from "../../lib/useRiskMapData";

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 420;

const BAND_COLORS = {
  LOW: "#2B7A57",
  MEDIUM: "#C9891F",
  HIGH: "#D85D45",
  CRITICAL: "#B64538",
};

function projectPoint(hotspot, bounds) {
  const horizontalSpan = bounds.maxLongitude - bounds.minLongitude || 1;
  const verticalSpan = bounds.maxLatitude - bounds.minLatitude || 1;
  const x = ((hotspot.longitude - bounds.minLongitude) / horizontalSpan) * CANVAS_WIDTH;
  const y = CANVAS_HEIGHT - ((hotspot.latitude - bounds.minLatitude) / verticalSpan) * CANVAS_HEIGHT;

  return {
    x: Number.isFinite(x) ? x : CANVAS_WIDTH / 2,
    y: Number.isFinite(y) ? y : CANVAS_HEIGHT / 2,
  };
}

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

function formatType(type) {
  return String(type || "mixed").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export default function RiskMapPanel({
  title = "Risk heatmap",
  description = "Weighted hotspot view based on severity, status, and report recency.",
}) {
  const [filters, setFilters] = useState({ days: 30, reportType: "ALL" });
  const { data, isLoading, error } = useRiskMapData(filters);
  const topLabels = new Set(data.topHotspots.map((hotspot) => hotspot.id));

  return (
    <section className="dashboard-panel dashboard-panel-wide risk-map-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="risk-filter-row">
          <label>
            <span>Window</span>
            <select
              className="input select"
              value={filters.days}
              onChange={(event) => setFilters((current) => ({ ...current, days: Number(event.target.value) }))}
            >
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>

          <label>
            <span>Type</span>
            <select
              className="input select"
              value={filters.reportType}
              onChange={(event) => setFilters((current) => ({ ...current, reportType: event.target.value }))}
            >
              <option value="ALL">All reports</option>
              <option value="LIVESTOCK">Livestock</option>
              <option value="CROP">Crop</option>
              <option value="ENVIRONMENT">Environment</option>
            </select>
          </label>
        </div>
      </div>

      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <div className="risk-map-layout">
        <div className="risk-map-stage">
          <svg className="risk-map-surface" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} role="img" aria-label="FarmGuard risk heatmap">
            <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} rx="24" fill="#F6F1E7" />

            {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
              <line
                key={`horizontal-${ratio}`}
                x1="0"
                y1={CANVAS_HEIGHT * ratio}
                x2={CANVAS_WIDTH}
                y2={CANVAS_HEIGHT * ratio}
                stroke="rgba(15, 26, 26, 0.08)"
                strokeDasharray="6 8"
              />
            ))}

            {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
              <line
                key={`vertical-${ratio}`}
                x1={CANVAS_WIDTH * ratio}
                y1="0"
                x2={CANVAS_WIDTH * ratio}
                y2={CANVAS_HEIGHT}
                stroke="rgba(15, 26, 26, 0.08)"
                strokeDasharray="6 8"
              />
            ))}

            <text x="18" y="30" className="risk-map-caption">Kenya risk view</text>

            {data.hotspots.map((hotspot) => {
              const point = projectPoint(hotspot, data.bounds);
              const color = BAND_COLORS[hotspot.band] || BAND_COLORS.MEDIUM;
              const outerRadius = 16 + Math.min(hotspot.riskScore, 18) * 2;
              const innerRadius = 5 + Math.min(hotspot.reportCount, 6);

              return (
                <g key={hotspot.id}>
                  <circle cx={point.x} cy={point.y} r={outerRadius} fill={color} opacity="0.12" />
                  <circle cx={point.x} cy={point.y} r={innerRadius} fill={color} opacity="0.92" />
                  {topLabels.has(hotspot.id) ? (
                    <text x={point.x + 12} y={point.y - 12} className="risk-map-label">
                      {hotspot.county}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          <div className="risk-map-legend">
            {Object.entries(BAND_COLORS).map(([band, color]) => (
              <span key={band} className="risk-legend-item">
                <i style={{ backgroundColor: color }} />
                {band}
              </span>
            ))}
          </div>

          {data.summary.estimatedHotspotCount ? (
            <p className="risk-map-note">
              {data.summary.estimatedHotspotCount} hotspot locations are approximated from county names because exact coordinates were not supplied.
            </p>
          ) : null}
        </div>

        <aside className="risk-map-sidebar">
          <div className="risk-summary-grid">
            <article className="risk-summary-chip">
              <span>Hotspots</span>
              <strong>{data.summary.hotspotCount}</strong>
            </article>
            <article className="risk-summary-chip">
              <span>Reports</span>
              <strong>{data.summary.reportCount}</strong>
            </article>
            <article className="risk-summary-chip">
              <span>Highest score</span>
              <strong>{formatScore(data.summary.highestRiskScore)}</strong>
            </article>
          </div>

          <div className="risk-band-row">
            {Object.entries(data.summary.bands || {}).map(([band, count]) => (
              <span key={band} className={`risk-band-pill risk-band-pill-${band.toLowerCase()}`}>{band}: {count}</span>
            ))}
          </div>

          <div className="risk-hotspot-list">
            <div className="risk-hotspot-head">
              <h3>Top hotspots</h3>
              {isLoading ? <span>Refreshing...</span> : <span>{filters.days}-day window</span>}
            </div>

            {data.topHotspots.length ? (
              data.topHotspots.map((hotspot) => (
                <article key={hotspot.id} className="risk-hotspot-card">
                  <div className="stack-item-row">
                    <strong>{hotspot.county}</strong>
                    <span className={`risk-badge risk-badge-${hotspot.band.toLowerCase()}`}>{hotspot.band}</span>
                  </div>
                  <p>{hotspot.label}</p>
                  <div className="meta-row">
                    <span>Score {formatScore(hotspot.riskScore)}</span>
                    <span>{hotspot.reportCount} reports</span>
                    <span>{formatType(hotspot.dominantType)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No hotspot data is available for the selected filters.</div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
