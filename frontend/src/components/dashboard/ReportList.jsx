function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function ReportList({
  reports,
  title = "Recent reports",
  description = "Latest field activity in your workspace.",
  renderFooter,
  isSelected,
}) {
  return (
    <section className="dashboard-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {reports.length ? (
        <div className="stack-list">
          {reports.map((report) => (
            <article key={report.id} className={`stack-item ${isSelected?.(report) ? "is-selected" : ""}`}>
              <div className="stack-item-row">
                <strong>{report.title}</strong>
                <span className={`risk-badge risk-badge-${report.severity?.toLowerCase() || "medium"}`}>{report.severity}</span>
              </div>
              <p>{report.description}</p>
              <div className="meta-row">
                <span>{report.reportType}</span>
                <span>{report.status}</span>
                <span>{report.location?.name || "Unknown location"}</span>
                <span>{formatDate(report.createdAt)}</span>
              </div>
              {report.reporter?.name ? (
                <p className="reporter-note">Reporter: {report.reporter.name} ({report.reporter.role})</p>
              ) : null}
              {report.review?.notes || report.review?.diagnosis || report.review?.recommendedActions?.length ? (
                <div className="review-summary">
                  {report.review.reviewedBy?.name ? (
                    <p className="reviewed-by">Reviewed by {report.review.reviewedBy.name}</p>
                  ) : null}
                  {report.review.diagnosis ? <p><strong>Diagnosis:</strong> {report.review.diagnosis}</p> : null}
                  {report.review.notes ? <p><strong>Notes:</strong> {report.review.notes}</p> : null}
                  {report.review.recommendedActions?.length ? (
                    <ul className="inline-list">
                      {report.review.recommendedActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {renderFooter ? <div className="card-actions">{renderFooter(report)}</div> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No reports have been submitted yet.</div>
      )}
    </section>
  );
}
