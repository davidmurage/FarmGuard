import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { useRiskMapData } from "../../lib/useRiskMapData";

const BAND_COLORS = {
  LOW: "#2B7A57",
  MEDIUM: "#C9891F",
  HIGH: "#D85D45",
  CRITICAL: "#B64538",
};

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

function formatType(type) {
  return String(type || "mixed").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getMapBounds(data) {
  if (data.hotspots.length) {
    return data.hotspots.map((hotspot) => [hotspot.latitude, hotspot.longitude]);
  }

  return [
    [data.bounds.minLatitude, data.bounds.minLongitude],
    [data.bounds.maxLatitude, data.bounds.maxLongitude],
  ];
}

function getHotspotRadius(hotspot) {
  return 10 + Math.min(hotspot.riskScore, 18) * 1.1 + Math.min(hotspot.reportCount, 8);
}

function RiskMapViewport({ data, selectedHotspotId }) {
  const map = useMap();

  useEffect(() => {
    const selectedHotspot = data.hotspots.find((hotspot) => hotspot.id === selectedHotspotId);

    if (selectedHotspot) {
      map.flyTo([selectedHotspot.latitude, selectedHotspot.longitude], Math.max(map.getZoom(), 8), {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    map.fitBounds(getMapBounds(data), {
      padding: [24, 24],
      maxZoom: 7,
    });
  }, [data, map, selectedHotspotId]);

  useEffect(() => {
    const panel = map.getContainer().closest('[role="tabpanel"]');

    if (!panel || typeof MutationObserver === "undefined") {
      return undefined;
    }

    const syncSize = () => {
      if (!panel.hidden) {
        window.requestAnimationFrame(() => {
          map.invalidateSize();
        });
      }
    };

    syncSize();

    const observer = new MutationObserver(syncSize);
    observer.observe(panel, {
      attributes: true,
      attributeFilter: ["hidden"],
    });

    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function RiskMapPanel({
  title = "Risk heatmap",
  description = "Weighted hotspot view based on severity, status, and report recency.",
}) {
  const [filters, setFilters] = useState({ days: 30, reportType: "ALL" });
  const [selectedHotspotId, setSelectedHotspotId] = useState("");
  const { data, isLoading, error } = useRiskMapData(filters);
  const topLabels = new Set(data.topHotspots.map((hotspot) => hotspot.id));

  useEffect(() => {
    if (!data.topHotspots.length) {
      setSelectedHotspotId("");
      return;
    }

    if (!data.topHotspots.some((hotspot) => hotspot.id === selectedHotspotId)) {
      setSelectedHotspotId(data.topHotspots[0].id);
    }
  }, [data.topHotspots, selectedHotspotId]);

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
          <div className="risk-map-canvas">
            <MapContainer
              className="risk-map-surface"
              center={[-0.4, 37.7]}
              zoom={6}
              minZoom={5}
              maxZoom={12}
              zoomControl={false}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ZoomControl position="bottomright" />
              <RiskMapViewport data={data} selectedHotspotId={selectedHotspotId} />

              {data.hotspots.map((hotspot) => {
                const color = BAND_COLORS[hotspot.band] || BAND_COLORS.MEDIUM;
                const isSelected = hotspot.id === selectedHotspotId;

                return (
                  <CircleMarker
                    key={hotspot.id}
                    center={[hotspot.latitude, hotspot.longitude]}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.45 : 0.22,
                      weight: isSelected ? 3 : 2,
                    }}
                    radius={getHotspotRadius(hotspot)}
                    eventHandlers={{
                      click: () => setSelectedHotspotId(hotspot.id),
                    }}
                  >
                    {topLabels.has(hotspot.id) ? (
                      <Tooltip direction="top" offset={[0, -12]} permanent={isSelected} opacity={0.95}>
                        {hotspot.county}
                      </Tooltip>
                    ) : null}
                    <Popup>
                      <div className="risk-map-popup">
                        <strong>{hotspot.county}</strong>
                        <p>{hotspot.label}</p>
                        <p>Risk score: {formatScore(hotspot.riskScore)}</p>
                        <p>Reports: {hotspot.reportCount}</p>
                        <p>Dominant type: {formatType(hotspot.dominantType)}</p>
                        <p>Latest report: {formatDate(hotspot.latestReportAt)}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {!data.hotspots.length && !isLoading ? (
              <div className="risk-map-empty-overlay">No hotspot data is available for the selected filters.</div>
            ) : null}
          </div>

          <div className="risk-map-legend">
            {Object.entries(BAND_COLORS).map(([band, color]) => (
              <span key={band} className="risk-legend-item">
                <i style={{ backgroundColor: color }} />
                {band}
              </span>
            ))}
          </div>

          <p className="risk-map-note">
            Live map tiles are provided by OpenStreetMap. Click a hotspot to open details, then zoom and pan just like a GPS map.
          </p>

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
              data.topHotspots.map((hotspot) => {
                const isSelected = hotspot.id === selectedHotspotId;

                return (
                  <button
                    key={hotspot.id}
                    type="button"
                    className={`risk-hotspot-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedHotspotId(hotspot.id)}
                  >
                    <div className="risk-hotspot-headline">
                      <strong>{hotspot.county}</strong>
                      <span className={`risk-badge risk-badge-${hotspot.band.toLowerCase()}`}>{hotspot.band}</span>
                    </div>
                    <p>{hotspot.label}</p>
                    <div className="meta-row">
                      <span>Score {formatScore(hotspot.riskScore)}</span>
                      <span>{hotspot.reportCount} reports</span>
                      <span>{formatType(hotspot.dominantType)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">No hotspot data is available for the selected filters.</div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
