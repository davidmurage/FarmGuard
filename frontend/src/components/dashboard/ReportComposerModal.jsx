import { useEffect } from "react";

function formatCoordinate(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "--";
}

function formatLocationSource(source) {
  switch (source) {
    case "county_lookup":
      return "Matched to the selected county.";
    case "county_estimate":
      return "Estimated from the location and county you entered.";
    case "location_estimate":
      return "Estimated from the location details you entered.";
    default:
      return "Coordinates will be attached automatically when you save.";
  }
}

export default function ReportComposerModal({
  open,
  mode = "create",
  form,
  message,
  resolvedLocation,
  isResolvingLocation,
  locationLookupError,
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

  const heading = mode === "edit" ? "Edit report" : "Submit a new report";
  const submitLabel = mode === "edit" ? "Save changes" : "Submit report";
  const busyLabel = mode === "edit" ? "Saving..." : "Submitting...";

  return (
    <div
      className="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-composer-title"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
    >
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2 id="report-composer-title">{heading}</h2>
            <p>Capture clear symptoms and location details so FarmGuard can respond earlier.</p>
          </div>
          <button type="button" className="modal-close" aria-label="Close report composer" onClick={onClose} disabled={isSaving}>
            Close
          </button>
        </div>

        <form className="dashboard-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              <span>Report type</span>
              <select name="reportType" className="input select" value={form.reportType} onChange={onChange}>
                <option value="LIVESTOCK">Livestock</option>
                <option value="CROP">Crop</option>
                <option value="ENVIRONMENT">Environment</option>
              </select>
            </label>

            <label>
              <span>Severity</span>
              <select name="severity" className="input select" value={form.severity} onChange={onChange}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
          </div>

          <label>
            <span>Title</span>
            <input className="input" name="title" value={form.title} onChange={onChange} placeholder="Suspected foot-and-mouth symptoms in dairy herd" />
          </label>

          <label>
            <span>Description</span>
            <textarea className="textarea" name="description" value={form.description} onChange={onChange} placeholder="Describe what you observed, how many animals or crops are affected, and when it started." />
          </label>

          <div className="form-grid">
            <label>
              <span>Location</span>
              <input className="input" name="locationName" value={form.locationName} onChange={onChange} placeholder="Ol Kalou" />
            </label>

            <label>
              <span>County</span>
              <input className="input" name="county" value={form.county} onChange={onChange} placeholder="Nyandarua" />
            </label>
          </div>

          <section className="auto-location-card" aria-live="polite">
            <div className="auto-location-head">
              <div>
                <strong>Automatic coordinates</strong>
                <p>Enter location and county, then FarmGuard will fetch the coordinates for you.</p>
              </div>
              {isResolvingLocation ? <span className="auto-location-pill">Fetching...</span> : null}
            </div>

            {resolvedLocation?.coordinates ? (
              <>
                <div className="auto-location-grid">
                  <div>
                    <span>Latitude</span>
                    <strong>{formatCoordinate(resolvedLocation.coordinates.latitude)}</strong>
                  </div>
                  <div>
                    <span>Longitude</span>
                    <strong>{formatCoordinate(resolvedLocation.coordinates.longitude)}</strong>
                  </div>
                </div>
                <p className="auto-location-source">{formatLocationSource(resolvedLocation.source)}</p>
              </>
            ) : locationLookupError ? (
              <p className="auto-location-error">{locationLookupError}</p>
            ) : (
              <p className="auto-location-placeholder">Coordinates will appear here once both fields are filled in.</p>
            )}
          </section>

          <label>
            <span>Symptoms or indicators</span>
            <input
              className="input"
              name="symptoms"
              value={form.symptoms}
              onChange={onChange}
              placeholder="fever, reduced milk yield, mouth lesions"
            />
          </label>

          <p className="help">Submitted reports can be edited only before vet review starts.</p>

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
