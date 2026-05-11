function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function EnvironmentalProviderSyncPanel({
  providers,
  onSync,
  syncingProviderKey = "",
}) {
  return (
    <section className="dashboard-panel dashboard-panel-wide">
      <div className="panel-head">
        <div>
          <h2>Live provider connectors</h2>
          <p>Scheduled weather and satellite feeds that can automatically enrich county environmental signals.</p>
        </div>
      </div>

      <div className="provider-grid">
        {providers.map((provider) => {
          const latestJob = provider.latestJob;
          const isSyncing = syncingProviderKey === provider.key;

          return (
            <article key={provider.key} className="provider-card">
              <div className="stack-item-row">
                <div>
                  <strong>{provider.label}</strong>
                  <p>{provider.description}</p>
                </div>
                <span className={`risk-badge risk-badge-${provider.enabled && provider.configured ? "low" : "medium"}`}>
                  {provider.enabled ? provider.configured ? "Ready" : "Needs config" : "Disabled"}
                </span>
              </div>

              <div className="meta-row">
                <span>Schedule {provider.intervalMinutes} min</span>
                <span>{provider.schedulerEnabled ? "Auto schedule on" : "Auto schedule off"}</span>
                <span>{provider.countyScope.join(", ")}</span>
              </div>

              <div className="provider-latest">
                <strong>Latest run</strong>
                {latestJob ? (
                  <>
                    <span>{formatDate(latestJob.createdAt)}</span>
                    <span>{formatLabel(latestJob.status)} | {latestJob.importedRecords} / {latestJob.totalRecords}</span>
                    <span>{latestJob.summaryMessage}</span>
                  </>
                ) : (
                  <span>No syncs have run yet.</span>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onSync?.(provider)}
                  disabled={!provider.enabled || !provider.configured || isSyncing || provider.isRunning}
                >
                  {isSyncing || provider.isRunning ? "Syncing..." : `Sync ${provider.providerName}`}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
