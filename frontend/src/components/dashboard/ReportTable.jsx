function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ReportTable({
  reports,
  title = "Recent reports",
  description = "Track submitted reports and manage the ones that are still editable.",
  onEdit,
  onDelete,
  deletingReportId = "",
}) {
  return (
    <section className="dashboard-panel dashboard-panel-wide">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {reports.length ? (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Location</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const canManage = report.status === "SUBMITTED" && !report.review?.reviewedAt;

                return (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.title}</strong>
                      <p>{report.description}</p>
                    </td>
                    <td>{formatLabel(report.reportType)}</td>
                    <td>
                      <span className={`risk-badge risk-badge-${report.severity?.toLowerCase() || "medium"}`}>
                        {formatLabel(report.severity)}
                      </span>
                    </td>
                    <td>{formatLabel(report.status)}</td>
                    <td>
                      <strong>{report.location?.name || "Unknown location"}</strong>
                      <span>{report.location?.county || "Unspecified"}</span>
                    </td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-table"
                          onClick={() => onEdit(report)}
                          disabled={!canManage || deletingReportId === report.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-table btn-danger-soft"
                          onClick={() => onDelete(report)}
                          disabled={!canManage || deletingReportId === report.id}
                        >
                          {deletingReportId === report.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      <span className="table-actions-note">
                        {canManage ? "Editable now" : "Locked after review starts"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No reports have been submitted yet.</div>
      )}
    </section>
  );
}
