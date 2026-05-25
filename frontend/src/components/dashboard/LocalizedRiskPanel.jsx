import { useLocalizedRiskData } from "../../lib/useLocalizedRiskData";

function formatDate(value) {
  if (!value) {
    return "No recent report";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatReportType(value) {
  return value === "LIVESTOCK" ? "Livestock" : value === "CROP" ? "Crop" : "Environment";
}

function renderSignals(signals) {
  if (!signals?.length) {
    return "No repeated signs captured yet";
  }

  return signals.join(", ");
}

export default function LocalizedRiskPanel({
  title = "Localized risk scores",
  description = "FarmGuard converts recent livestock and crop reports into county-level early-warning scores from 0 to 100.",
}) {
  const { data, isLoading, error } = useLocalizedRiskData();
  const featuredCounty = data.userCountyScore?.county ? data.userCountyScore : null;
  const visibleCounties = data.counties.slice(0, 12);

  return (
    <section className="dashboard-panel dashboard-panel-wide">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}
      {isLoading ? <div className="dashboard-banner">Scoring recent county risk signals...</div> : null}

      {!isLoading ? (
        <>
          <section className="localized-risk-summary">
            <article className="localized-risk-stat">
              <span>Counties scored</span>
              <strong>{data.summary.countyCount}</strong>
            </article>
            <article className="localized-risk-stat">
              <span>High-risk counties</span>
              <strong>{data.summary.highRiskCountyCount}</strong>
            </article>
            <article className="localized-risk-stat">
              <span>Critical counties</span>
              <strong>{data.summary.criticalCountyCount}</strong>
            </article>
            <article className="localized-risk-stat">
              <span>Highest score</span>
              <strong>{data.summary.highestScore}</strong>
            </article>
          </section>

          {featuredCounty ? (
            <section className="localized-risk-featured">
              <div className="localized-risk-featured-head">
                <div>
                  <span className="localized-risk-kicker">Your county focus</span>
                  <h3>{featuredCounty.county}</h3>
                </div>
                <div className="localized-risk-score-block">
                  <strong className="localized-risk-score">{featuredCounty.overallScore}</strong>
                  <span className={`risk-badge risk-badge-${featuredCounty.riskLevel?.toLowerCase() || "medium"}`}>
                    {featuredCounty.riskLevel}
                  </span>
                </div>
              </div>

              <div className="localized-risk-meta">
                <span>{featuredCounty.reportCount} recent reports</span>
                <span>{featuredCounty.highRiskCount} high-risk</span>
                <span>{featuredCounty.verifiedCount} verified</span>
                <span>Updated from {formatDate(featuredCounty.latestReportAt)}</span>
              </div>

              <ul className="localized-risk-driver-list">
                {featuredCounty.topDrivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>

              {featuredCounty.domainScores?.length ? (
                <div className="localized-risk-domain-list">
                  {featuredCounty.domainScores.map((domainScore) => (
                    <article key={`${featuredCounty.countyKey}-${domainScore.reportType}`} className="localized-risk-domain-card">
                      <div className="localized-risk-domain-head">
                        <strong>{formatReportType(domainScore.reportType)}</strong>
                        <span>{domainScore.riskScore}/100</span>
                      </div>
                      <p>{renderSignals(domainScore.dominantSignals)}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {visibleCounties.length ? (
            <div className="dashboard-table-wrap dashboard-table-wrap-scroll-y localized-risk-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>County</th>
                    <th>Score</th>
                    <th>Reports</th>
                    <th>Primary domain</th>
                    <th>Repeated signs</th>
                    <th>Drivers</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCounties.map((county) => (
                    <tr key={county.countyKey}>
                      <td>
                        <strong>{county.county}</strong>
                        <span>{formatDate(county.latestReportAt)}</span>
                      </td>
                      <td>
                        <div className="localized-risk-score-cell">
                          <strong>{county.overallScore}</strong>
                          <span className={`risk-badge risk-badge-${county.riskLevel?.toLowerCase() || "medium"}`}>
                            {county.riskLevel}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{county.reportCount}</strong>
                        <span>{county.highRiskCount} high-risk / {county.verifiedCount} verified</span>
                      </td>
                      <td>
                        <div className="localized-risk-chip-row">
                          {county.domainScores.map((domainScore) => (
                            <span key={`${county.countyKey}-${domainScore.reportType}`} className="localized-risk-chip">
                              {formatReportType(domainScore.reportType)} {domainScore.riskScore}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{renderSignals(county.topSignals)}</td>
                      <td>
                        <ul className="localized-risk-inline-list">
                          {county.topDrivers.slice(0, 2).map((driver) => (
                            <li key={driver}>{driver}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">FarmGuard has not received enough recent livestock or crop reports to score counties yet.</div>
          )}
        </>
      ) : null}
    </section>
  );
}
