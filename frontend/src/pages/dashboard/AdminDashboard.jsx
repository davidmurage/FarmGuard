import { useState } from "react";

import AlertList from "../../components/dashboard/AlertList";
import DashboardShell from "../../components/dashboard/DashboardShell";
import ReportList from "../../components/dashboard/ReportList";
import SummaryCard from "../../components/dashboard/SummaryCard";
import { apiPost, extractApiErrorMessage } from "../../lib/api";
import { useDashboardData } from "../../lib/useDashboardData";

const INITIAL_ALERT = {
  title: "",
  message: "",
  locationName: "",
  category: "Disease",
  riskLevel: "HIGH",
  targetRoles: "ALL",
  actionItems: "",
};

export default function AdminDashboard() {
  const { data, isLoading, error, reload } = useDashboardData();
  const [form, setForm] = useState(INITIAL_ALERT);
  const [formMessage, setFormMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const publishAlert = async (event) => {
    event.preventDefault();
    setIsPublishing(true);
    setFormMessage("");

    try {
      await apiPost(
        "/api/alerts",
        {
          ...form,
          targetRoles: [form.targetRoles],
          actionItems: form.actionItems
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        { auth: true },
      );

      setForm(INITIAL_ALERT);
      setFormMessage("Alert published successfully.");
      await reload();
    } catch (publishError) {
      setFormMessage(extractApiErrorMessage(publishError, "Unable to publish alert."));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DashboardShell
      title="Admin command dashboard"
      subtitle="Monitor platform-wide signals, publish advisories, and coordinate system response."
      quickActions={data.quickActions}
    >
      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <section className="summary-grid">
        {data.summaryCards.map((card) => (
          <SummaryCard key={card.key} card={card} />
        ))}
      </section>

      <section className="dashboard-layout">
        <section className="dashboard-panel dashboard-panel-wide">
          <div className="panel-head">
            <div>
              <h2>Publish an alert</h2>
              <p>Send targeted response instructions to farmers, vets, or all users.</p>
            </div>
          </div>

          <form className="dashboard-form" onSubmit={publishAlert}>
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input className="input" name="title" value={form.title} onChange={onChange} placeholder="High anthrax risk advisory" />
              </label>

              <label>
                <span>Location</span>
                <input className="input" name="locationName" value={form.locationName} onChange={onChange} placeholder="Nyandarua North" />
              </label>
            </div>

            <label>
              <span>Message</span>
              <textarea className="textarea" name="message" value={form.message} onChange={onChange} placeholder="Describe the risk, affected area, and what teams should do next." />
            </label>

            <div className="form-grid">
              <label>
                <span>Category</span>
                <input className="input" name="category" value={form.category} onChange={onChange} placeholder="Disease" />
              </label>

              <label>
                <span>Risk level</span>
                <select className="input select" name="riskLevel" value={form.riskLevel} onChange={onChange}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                <span>Audience</span>
                <select className="input select" name="targetRoles" value={form.targetRoles} onChange={onChange}>
                  <option value="ALL">All users</option>
                  <option value="FARMER">Farmers</option>
                  <option value="VET">Vets</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </label>

              <label>
                <span>Action items</span>
                <input className="input" name="actionItems" value={form.actionItems} onChange={onChange} placeholder="isolate livestock, contact field vet, sample affected soil" />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isPublishing}>
                {isPublishing ? "Publishing..." : "Publish alert"}
              </button>
            </div>

            {formMessage ? <div className="dashboard-banner">{formMessage}</div> : null}
          </form>
        </section>

        <AlertList alerts={data.activeAlerts} title="Published alerts" emptyMessage="No alerts have been published yet." />
        <ReportList
          reports={data.recentReports}
          title="System-wide recent reports"
          description="Track the latest signals entering the platform across all operational roles."
        />
      </section>

      {isLoading ? <div className="dashboard-banner">Loading latest dashboard data...</div> : null}
    </DashboardShell>
  );
}
