function formatDate(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
          {alerts.map((alert) => (
            <article key={alert.id} className="stack-item alert-item">
              <div className="stack-item-row">
                <strong>{alert.title}</strong>
                <span className={`risk-badge risk-badge-${alert.riskLevel?.toLowerCase() || "medium"}`}>{alert.riskLevel}</span>
              </div>
              <p>{alert.message}</p>
              <div className="meta-row">
                <span>{alert.category}</span>
                <span>{alert.locationName}</span>
                <span>{formatDate(alert.createdAt)}</span>
              </div>
              {alert.actionItems?.length ? (
                <ul className="inline-list">
                  {alert.actionItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  );
}
