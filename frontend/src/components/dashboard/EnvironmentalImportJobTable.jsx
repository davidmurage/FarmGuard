import { useState } from "react";

const DEFAULT_VISIBLE_JOBS = 5;

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function EnvironmentalImportJobTable({ jobs }) {
  const [showAllJobs, setShowAllJobs] = useState(false);
  const hiddenJobCount = Math.max(jobs.length - DEFAULT_VISIBLE_JOBS, 0);
  const visibleJobs = showAllJobs ? jobs : jobs.slice(0, DEFAULT_VISIBLE_JOBS);

  return (
    <section className="dashboard-panel dashboard-panel-wide">
      <div className="panel-head">
        <div>
          <h2>Import history</h2>
          <p>Track weather, satellite, and government ingestion runs feeding the early-warning model.</p>
        </div>
        {hiddenJobCount ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowAllJobs((current) => !current)}
          >
            {showAllJobs ? "Show latest imports" : `Show all ${jobs.length}`}
          </button>
        ) : null}
      </div>

      {jobs.length ? (
        <p className="compact-panel-meta">
          {showAllJobs
            ? `Showing all ${jobs.length} import runs in an internal scroll area.`
            : `Showing the latest ${visibleJobs.length} import runs first to reduce tab scrolling.`}
        </p>
      ) : null}

      {jobs.length ? (
        <div className={`dashboard-table-wrap ${showAllJobs ? "dashboard-table-wrap-scroll-y" : ""}`}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Feed</th>
                <th>Status</th>
                <th>Imported</th>
                <th>Counties</th>
                <th>Summary</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((job) => (
                <tr key={job.id}>
                    <td>
                      <strong>{job.providerName || "FarmGuard import"}</strong>
                      <span>
                        {formatLabel(job.sourceType)} | {job.importFormat}
                        {job.jobType === "PROVIDER_SYNC" ? ` | ${formatLabel(job.triggerMode)}` : ""}
                      </span>
                    </td>
                  <td>
                    <span className={`risk-badge risk-badge-${job.status === "FAILED" ? "critical" : job.status === "PARTIAL" ? "medium" : "low"}`}>
                      {formatLabel(job.status)}
                    </span>
                  </td>
                  <td>
                    <strong>{job.importedRecords} / {job.totalRecords}</strong>
                    <span>{job.failedRecords} failed rows</span>
                  </td>
                  <td>
                    <strong>{job.importedCounties.length ? job.importedCounties.join(", ") : "--"}</strong>
                  </td>
                  <td>
                    <strong>{job.summaryMessage}</strong>
                    {job.errorSamples.length ? <span>{job.errorSamples[0]}</span> : <span>No row errors recorded.</span>}
                  </td>
                  <td>
                    <strong>{formatDate(job.createdAt)}</strong>
                    <span>{job.createdBy?.name ? `By ${job.createdBy.name}` : "FarmGuard"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No environmental feed imports have been run yet.</div>
      )}
    </section>
  );
}
