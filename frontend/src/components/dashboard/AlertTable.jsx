function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatList(values) {
  if (!values?.length) {
    return "--";
  }

  return values.join(", ");
}

export default function AlertTable({
  alerts,
  title = "Published alerts",
  description = "Published advisories currently visible across the platform.",
  onEdit,
  onToggleActive,
  onDelete,
  processingAlertId = "",
  processingAction = "",
}) {
  return (
    <section className="dashboard-panel dashboard-panel-wide">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {alerts.length ? (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Alert</th>
                <th>Category</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Audience</th>
                <th>Location</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const isProcessing = processingAlertId === alert.id;
                const isDeleting = isProcessing && processingAction === "delete";
                const isToggling = isProcessing && processingAction === "toggle";

                return (
                  <tr key={alert.id}>
                    <td>
                      <strong>{alert.title}</strong>
                      <p>{alert.message}</p>
                      {alert.actionItems?.length ? (
                        <span className="table-detail-note">Actions: {formatList(alert.actionItems)}</span>
                      ) : null}
                    </td>
                    <td>{alert.category || "Advisory"}</td>
                    <td>
                      <span className={`risk-badge risk-badge-${alert.riskLevel?.toLowerCase() || "medium"}`}>
                        {alert.riskLevel || "MEDIUM"}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge ${alert.isActive ? "risk-badge-low" : "risk-badge-medium"}`}>
                        {alert.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <strong>{formatList(alert.targetRoles)}</strong>
                      <span>{alert.createdBy?.name ? `By ${alert.createdBy.name}` : "FarmGuard admin"}</span>
                    </td>
                    <td>{alert.locationName || "Regional"}</td>
                    <td>{formatDate(alert.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-table"
                          onClick={() => onEdit?.(alert)}
                          disabled={isProcessing}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-table"
                          onClick={() => onToggleActive?.(alert)}
                          disabled={isProcessing}
                        >
                          {isToggling ? "Saving..." : alert.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-table btn-danger-soft"
                          onClick={() => onDelete?.(alert)}
                          disabled={isProcessing}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
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
        <div className="empty-state">No alerts have been published yet.</div>
      )}
    </section>
  );
}
