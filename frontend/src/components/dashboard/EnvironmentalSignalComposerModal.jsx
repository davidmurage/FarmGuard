import { useEffect } from "react";

export default function EnvironmentalSignalComposerModal({
  open,
  mode = "create",
  form,
  message,
  isSaving,
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
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSaving, onClose, open]);

  if (!open) {
    return null;
  }

  const heading = mode === "edit" ? "Edit environmental signal" : "Log environmental signal";
  const submitLabel = mode === "edit" ? "Save changes" : "Log signal";
  const busyLabel = mode === "edit" ? "Saving..." : "Logging...";

  return (
    <div
      className="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="environmental-signal-title"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
    >
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2 id="environmental-signal-title">{heading}</h2>
            <p>Capture county conditions so FarmGuard can blend environmental pressure with field reports.</p>
          </div>
          <button type="button" className="modal-close" aria-label="Close environmental signal composer" onClick={onClose} disabled={isSaving}>
            Close
          </button>
        </div>

        <form className="dashboard-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              <span>County</span>
              <input className="input" name="county" value={form.county} onChange={onChange} placeholder="Nyandarua" />
            </label>

            <label>
              <span>Location</span>
              <input className="input" name="locationName" value={form.locationName} onChange={onChange} placeholder="Ol Kalou corridor" />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Source type</span>
              <select className="input select" name="sourceType" value={form.sourceType} onChange={onChange}>
                <option value="MANUAL_ENTRY">Manual entry</option>
                <option value="WEATHER_FEED">Weather feed</option>
                <option value="SATELLITE_FEED">Satellite feed</option>
                <option value="GOV_UPLOAD">Government upload</option>
              </select>
            </label>

            <label>
              <span>Captured at</span>
              <input className="input" type="datetime-local" name="capturedAt" value={form.capturedAt} onChange={onChange} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Rainfall (mm)</span>
              <input className="input" type="number" name="rainfallMm" value={form.rainfallMm} onChange={onChange} placeholder="72" />
            </label>

            <label>
              <span>Humidity (%)</span>
              <input className="input" type="number" name="humidityPct" value={form.humidityPct} onChange={onChange} placeholder="81" />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Temperature (C)</span>
              <input className="input" type="number" step="0.1" name="temperatureC" value={form.temperatureC} onChange={onChange} placeholder="29.5" />
            </label>

            <label>
              <span>Vegetation index</span>
              <input className="input" type="number" name="vegetationIndex" value={form.vegetationIndex} onChange={onChange} placeholder="42" />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Soil moisture (%)</span>
              <input className="input" type="number" name="soilMoisturePct" value={form.soilMoisturePct} onChange={onChange} placeholder="37" />
            </label>

            <label>
              <span>Notes</span>
              <input className="input" name="notes" value={form.notes} onChange={onChange} placeholder="Pasture browning in lowland zones after two hot weeks" />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? busyLabel : submitLabel}
            </button>
          </div>

          {message ? <div className="dashboard-banner">{message}</div> : null}
        </form>
      </section>
    </div>
  );
}
