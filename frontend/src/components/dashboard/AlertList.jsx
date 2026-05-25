function formatDate(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSignalSummary(alert) {
  if (alert.sourceKind !== "AUTO_REPORT_CLUSTER" || !alert.signalSummary?.reportCount) {
    return "";
  }

  const reportType = alert.signalSummary.reportType?.toLowerCase() || "report";
  return `Detected from ${alert.signalSummary.reportCount} recent ${reportType} reports, ${alert.signalSummary.highRiskCount} high-risk, and ${alert.signalSummary.verifiedCount} verified cases.`;
}

export default function AlertList({ alerts, title = "Active alerts", emptyMessage = "No active alerts right now." }) {
  return (
    <section className="dashboard-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>Role-filtered notifications and response guidance.</p>
        </div>
      </div>

      {alerts.length ? (
        <div className="stack-list">
          {alerts.map((alert) => {
            const signalSummary = buildSignalSummary(alert);

            return (
              <article key={alert.id} className="stack-item alert-item">
                <div className="stack-item-row">
                  <strong>{alert.title}</strong>
                  <span className={`risk-badge risk-badge-${alert.riskLevel?.toLowerCase() || "medium"}`}>{alert.riskLevel}</span>
                </div>
                <p>{alert.message}</p>
                {signalSummary ? <p className="reporter-note">{signalSummary}</p> : null}
                <div className="meta-row">
                  <span>{alert.category}</span>
                  <span>{alert.locationName}</span>
                  <span>{formatDate(alert.updatedAt || alert.createdAt)}</span>
                </div>
                {alert.actionItems?.length ? (
                  <ul className="inline-list">
                    {alert.actionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  );
}
