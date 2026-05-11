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

function formatChannelLabel(channel) {
  if (channel === "WHATSAPP") {
    return "WhatsApp";
  }

  if (channel === "IN_APP") {
    return "In-app";
  }

  return "SMS";
}

function formatDeliveryStatusLabel(status) {
  switch (status) {
    case "QUEUED":
      return "Queued";
    case "PARTIAL":
      return "Partial";
    case "FAILED":
      return "Failed";
    default:
      return "In-app only";
  }
}

function formatDeliveryStatusTone(status) {
  switch (status) {
    case "QUEUED":
      return "risk-badge-low";
    case "PARTIAL":
      return "risk-badge-medium";
    case "FAILED":
      return "risk-badge-critical";
    default:
      return "risk-badge-medium";
  }
}

function buildDeliveryLines(alert) {
  const summary = alert.deliverySummary || {};
  const lines = [];

  if (alert.deliveryChannels?.includes("SMS")) {
    lines.push(`SMS ${summary.sms?.queued || 0} queued, ${summary.sms?.failed || 0} failed, ${summary.sms?.skipped || 0} skipped`);
  }

  if (alert.deliveryChannels?.includes("WHATSAPP")) {
    lines.push(`WhatsApp ${summary.whatsapp?.queued || 0} queued, ${summary.whatsapp?.failed || 0} failed, ${summary.whatsapp?.skipped || 0} skipped`);
  }

  return lines.length ? lines : ["No external delivery requested."];
}

export default function AlertTable({
  alerts,
  title = "Published alerts",
  description = "Published advisories currently visible across the platform.",
  onEdit,
  onDeliver,
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
                <th>Channels</th>
                <th>Delivery</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const isProcessing = processingAlertId === alert.id;
                const isDeleting = isProcessing && processingAction === "delete";
                const isToggling = isProcessing && processingAction === "toggle";
                const isDelivering = isProcessing && processingAction === "deliver";
                const hasExternalChannel = alert.deliveryChannels?.some((channel) => channel === "SMS" || channel === "WHATSAPP");

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
                    <td>
                      <div className="channel-chip-row">
                        {(alert.deliveryChannels || ["IN_APP"]).map((channel) => (
                          <span key={channel} className="channel-chip">
                            {formatChannelLabel(channel)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`risk-badge ${formatDeliveryStatusTone(alert.deliveryStatus)}`}>
                        {formatDeliveryStatusLabel(alert.deliveryStatus)}
                      </span>
                      <div className="delivery-detail-list">
                        {buildDeliveryLines(alert).map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                        {alert.deliverySummary?.audienceSize ? (
                          <span>Audience matched: {alert.deliverySummary.audienceSize}</span>
                        ) : null}
                        {alert.deliverySummary?.providerMode ? (
                          <span>Mode: {alert.deliverySummary.providerMode}</span>
                        ) : null}
                      </div>
                    </td>
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
                          onClick={() => onDeliver?.(alert)}
                          disabled={isProcessing || !alert.isActive || !hasExternalChannel}
                        >
                          {isDelivering ? "Sending..." : alert.deliveryStatus === "NOT_REQUESTED" ? "Send" : "Resend"}
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
                      {!hasExternalChannel ? <span className="table-actions-note">Enable SMS or WhatsApp to send outside the dashboard.</span> : null}
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
