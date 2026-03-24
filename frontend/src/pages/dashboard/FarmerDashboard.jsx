import { useState } from "react";

import AlertList from "../../components/dashboard/AlertList";
import DashboardShell from "../../components/dashboard/DashboardShell";
import ReportList from "../../components/dashboard/ReportList";
import SummaryCard from "../../components/dashboard/SummaryCard";
import { apiPost, extractApiErrorMessage } from "../../lib/api";
import { useDashboardData } from "../../lib/useDashboardData";

const INITIAL_FORM = {
  reportType: "LIVESTOCK",
  title: "",
  description: "",
  locationName: "",
  county: "",
  severity: "MEDIUM",
  symptoms: "",
};

export default function FarmerDashboard() {
  const { data, isLoading, error, reload } = useDashboardData();
  const [form, setForm] = useState(INITIAL_FORM);
  const [formMessage, setFormMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage("");

    try {
      await apiPost(
        "/api/reports",
        {
          ...form,
          symptoms: form.symptoms
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        { auth: true },
      );

      setForm(INITIAL_FORM);
      setFormMessage("Report submitted. Your dashboard has been refreshed.");
      await reload();
    } catch (submitError) {
      setFormMessage(extractApiErrorMessage(submitError, "Unable to submit report."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Farmer dashboard"
      subtitle="Log livestock, crop, or environmental warning signs and stay ahead of local outbreaks."
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
              <h2>Submit a field report</h2>
              <p>Capture symptoms early so FarmGuard can surface patterns sooner.</p>
            </div>
          </div>

          <form className="dashboard-form" onSubmit={submitReport}>
            <div className="form-grid">
              <label>
                <span>Report type</span>
                <select name="reportType" className="input select" value={form.reportType} onChange={onChange}>
                  <option value="LIVESTOCK">Livestock</option>
                  <option value="CROP">Crop</option>
                  <option value="ENVIRONMENT">Environment</option>
                </select>
              </label>

              <label>
                <span>Severity</span>
                <select name="severity" className="input select" value={form.severity} onChange={onChange}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
            </div>

            <label>
              <span>Title</span>
              <input className="input" name="title" value={form.title} onChange={onChange} placeholder="Suspected foot-and-mouth symptoms in dairy herd" />
            </label>

            <label>
              <span>Description</span>
              <textarea className="textarea" name="description" value={form.description} onChange={onChange} placeholder="Describe what you observed, how many animals or crops are affected, and when it started." />
            </label>

            <div className="form-grid">
              <label>
                <span>Location</span>
                <input className="input" name="locationName" value={form.locationName} onChange={onChange} placeholder="Ol Kalou" />
              </label>

              <label>
                <span>County</span>
                <input className="input" name="county" value={form.county} onChange={onChange} placeholder="Nyandarua" />
              </label>
            </div>

            <label>
              <span>Symptoms or indicators</span>
              <input
                className="input"
                name="symptoms"
                value={form.symptoms}
                onChange={onChange}
                placeholder="fever, reduced milk yield, mouth lesions"
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? "Submitting..." : "Submit report"}
              </button>
            </div>

            {formMessage ? <div className="dashboard-banner">{formMessage}</div> : null}
          </form>
        </section>

        <AlertList alerts={data.activeAlerts} />
        <ReportList reports={data.recentReports} title="My recent reports" description="Track what you have submitted and what needs follow-up." />
        <section className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>What to include</h2>
              <p>High-quality reports improve early warning confidence.</p>
            </div>
          </div>
          <ul className="action-list">
            <li>Include the first day you noticed symptoms.</li>
            <li>Estimate how many animals or fields are affected.</li>
            <li>Use severity to flag urgent cases that need fast intervention.</li>
          </ul>
        </section>
      </section>

      {isLoading ? <div className="dashboard-banner">Loading latest dashboard data...</div> : null}
    </DashboardShell>
  );
}
