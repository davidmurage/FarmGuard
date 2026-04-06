function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSourceType(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function EnvironmentalSignalTable({
  signals,
  onEdit,
  onDelete,
  processingSignalId = "",
}) {
  return (
    <section className="dashboard-panel dashboard-panel-wide">
      <div className="panel-head">
        <div>
          <h2>Environmental signals</h2>
          <p>Recent county-level conditions feeding the early-warning engine.</p>
        </div>
      </div>

      {signals.length ? (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>County</th>
                <th>Source</th>
                <th>Conditions</th>
                <th>Captured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => {
                const isProcessing = processingSignalId === signal.id;

                return (
                  <tr key={signal.id}>
                    <td>
                      <strong>{signal.county}</strong>
                      <span>{signal.locationName || "Regional"}</span>
                    </td>
                    <td>
                      <strong>{formatSourceType(signal.sourceType)}</strong>
                      <span>{signal.createdBy?.name ? `By ${signal.createdBy.name}` : "FarmGuard"}</span>
                    </td>
                    <td>
                      <strong>Rain {signal.rainfallMm} mm | Humidity {signal.humidityPct}%</strong>
                      <p>Temp {signal.temperatureC} C | Vegetation {signal.vegetationIndex} | Soil {signal.soilMoisturePct}%</p>
                      {signal.notes ? <span className="table-detail-note">{signal.notes}</span> : null}
                    </td>
                    <td>{formatDate(signal.capturedAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-table"
                          onClick={() => onEdit?.(signal)}
                          disabled={isProcessing}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-table btn-danger-soft"
                          onClick={() => onDelete?.(signal)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No environmental signals have been logged yet.</div>
      )}
    </section>
  );
}
