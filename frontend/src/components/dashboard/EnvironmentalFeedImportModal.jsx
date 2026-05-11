import { useEffect } from "react";

const CSV_TEMPLATE = `county,locationName,rainfallMm,humidityPct,temperatureC,vegetationIndex,soilMoisturePct,capturedAt,notes
Nakuru,Subukia corridor,84,78,28.4,46,63,2026-05-05T09:30,Heavy rainfall near dairy belt`;

const JSON_TEMPLATE = `[
  {
    "county": "Nakuru",
    "locationName": "Subukia corridor",
    "rainfallMm": 84,
    "humidityPct": 78,
    "temperatureC": 28.4,
    "vegetationIndex": 46,
    "soilMoisturePct": 63,
    "capturedAt": "2026-05-05T09:30:00Z",
    "notes": "Heavy rainfall near dairy belt"
  }
]`;

export default function EnvironmentalFeedImportModal({
  open,
  form,
  message,
  isImporting,
  onChange,
  onClose,
  onSubmit,
}) {
  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !isImporting) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isImporting, onClose, open]);

  if (!open) {
    return null;
  }

  const sampleData = form.importFormat === "CSV" ? CSV_TEMPLATE : JSON_TEMPLATE;

  return (
    <div
      className="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="environmental-feed-import-title"
      onClick={() => {
        if (!isImporting) {
          onClose();
        }
      }}
    >
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2 id="environmental-feed-import-title">Import environmental feed</h2>
            <p>Paste CSV or JSON data from weather stations, satellite analysis, or government bulletins for bulk ingestion.</p>
          </div>
          <button type="button" className="modal-close" aria-label="Close environmental import modal" onClick={onClose} disabled={isImporting}>
            Close
          </button>
        </div>

        <form className="dashboard-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              <span>Feed source</span>
              <select className="input select" name="sourceType" value={form.sourceType} onChange={onChange}>
                <option value="WEATHER_FEED">Weather feed</option>
                <option value="SATELLITE_FEED">Satellite feed</option>
                <option value="GOV_UPLOAD">Government upload</option>
              </select>
            </label>

            <label>
              <span>Format</span>
              <select className="input select" name="importFormat" value={form.importFormat} onChange={onChange}>
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
              </select>
            </label>
          </div>

          <label>
            <span>Provider name</span>
            <input className="input" name="providerName" value={form.providerName} onChange={onChange} placeholder="Kenya Meteorological Department" />
          </label>

          <label>
            <span>Paste data</span>
            <textarea
              className="input textarea textarea-lg"
              name="rawData"
              value={form.rawData}
              onChange={onChange}
              placeholder={sampleData}
            />
          </label>

          <div className="import-template-card">
            <strong>Template</strong>
            <pre>{sampleData}</pre>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isImporting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isImporting}>
              {isImporting ? "Importing..." : "Import feed"}
            </button>
          </div>

          {message ? <div className="dashboard-banner">{message}</div> : null}
        </form>
      </section>
    </div>
  );
}
