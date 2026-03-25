import { useState } from "react";

import AlertList from "../../components/dashboard/AlertList";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardTabs from "../../components/dashboard/DashboardTabs";
import KnowledgeBasePanel from "../../components/dashboard/KnowledgeBasePanel";
import QuickActionsPanel from "../../components/dashboard/QuickActionsPanel";
import ReportComposerModal from "../../components/dashboard/ReportComposerModal";
import ReportTable from "../../components/dashboard/ReportTable";
import RiskMapPanel from "../../components/dashboard/RiskMapPanel";
import SummaryCard from "../../components/dashboard/SummaryCard";
import { apiDelete, apiPatch, apiPost, extractApiErrorMessage } from "../../lib/api";
import { useDashboardData } from "../../lib/useDashboardData";

const INITIAL_FORM = {
  reportType: "LIVESTOCK",
  title: "",
  description: "",
  locationName: "",
  county: "",
  latitude: "",
  longitude: "",
  severity: "MEDIUM",
  symptoms: "",
};

function buildFormFromReport(report) {
  return {
    reportType: report.reportType || "LIVESTOCK",
    title: report.title || "",
    description: report.description || "",
    locationName: report.location?.name || "",
    county: report.location?.county || "",
    latitude: report.location?.coordinates?.latitude != null ? String(report.location.coordinates.latitude) : "",
    longitude: report.location?.coordinates?.longitude != null ? String(report.location.coordinates.longitude) : "",
    severity: report.severity || "MEDIUM",
    symptoms: (report.symptoms || []).join(", "),
  };
}

export default function FarmerDashboard() {
  const { data, isLoading, error, reload } = useDashboardData();
  const [form, setForm] = useState(INITIAL_FORM);
  const [composerMessage, setComposerMessage] = useState("");
  const [reportCenterMessage, setReportCenterMessage] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreateComposer = () => {
    setEditingReport(null);
    setForm(INITIAL_FORM);
    setComposerMessage("");
    setReportCenterMessage("");
    setIsComposerOpen(true);
  };

  const openEditComposer = (report) => {
    setEditingReport(report);
    setForm(buildFormFromReport(report));
    setComposerMessage("");
    setReportCenterMessage("");
    setIsComposerOpen(true);
  };

  const closeComposer = () => {
    if (isSaving) {
      return;
    }

    setIsComposerOpen(false);
    setEditingReport(null);
    setForm(INITIAL_FORM);
    setComposerMessage("");
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setComposerMessage("");

    try {
      const payload = {
        ...form,
        symptoms: form.symptoms
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editingReport) {
        await apiPatch(`/api/reports/${editingReport.id}`, payload, { auth: true });
        setReportCenterMessage("Report updated successfully.");
      } else {
        await apiPost("/api/reports", payload, { auth: true });
        setReportCenterMessage("Report submitted. Your dashboard has been refreshed.");
      }

      setForm(INITIAL_FORM);
      setEditingReport(null);
      setIsComposerOpen(false);
      await reload();
    } catch (submitError) {
      setComposerMessage(extractApiErrorMessage(submitError, "Unable to save report."));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReport = async (report) => {
    const confirmed = window.confirm(`Delete "${report.title}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingReportId(report.id);
    setReportCenterMessage("");

    try {
      await apiDelete(`/api/reports/${report.id}`, { auth: true });
      setReportCenterMessage("Report deleted successfully.");

      if (editingReport?.id === report.id) {
        closeComposer();
      }

      await reload();
    } catch (deleteError) {
      setReportCenterMessage(extractApiErrorMessage(deleteError, "Unable to delete report."));
    } finally {
      setDeletingReportId("");
    }
  };

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <>
          <section className="summary-grid">
            {data.summaryCards.map((card) => (
              <SummaryCard key={card.key} card={card} />
            ))}
          </section>
          <QuickActionsPanel quickActions={data.quickActions} />
        </>
      ),
    },
    {
      id: "report-center",
      label: "Report Center",
      content: (
        <>
          <section className="dashboard-panel dashboard-panel-wide dashboard-launch-panel">
            <div className="panel-head">
              <div>
                <h2>Manage reports</h2>
                <p>Open the report composer when you need to submit something new or revise a submitted case.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={openCreateComposer}>
                Submit new report
              </button>
            </div>
            <p className="dashboard-launch-note">
              You can edit or delete reports while they are still in the submitted stage. Once review begins, the row is locked.
            </p>
            {reportCenterMessage ? <div className="dashboard-banner">{reportCenterMessage}</div> : null}
          </section>

          <ReportTable
            reports={data.recentReports}
            title="My recent reports"
            description="Use the action buttons to manage reports that have not entered review yet."
            onEdit={openEditComposer}
            onDelete={deleteReport}
            deletingReportId={deletingReportId}
          />

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

          <ReportComposerModal
            open={isComposerOpen}
            mode={editingReport ? "edit" : "create"}
            form={form}
            message={composerMessage}
            isSaving={isSaving}
            onChange={onChange}
            onClose={closeComposer}
            onSubmit={submitReport}
          />
        </>
      ),
    },
    {
      id: "alerts",
      label: "Alerts",
      content: <AlertList alerts={data.activeAlerts} />,
    },
    {
      id: "risk-map",
      label: "Risk Map",
      content: (
        <RiskMapPanel
          title="Regional risk heatmap"
          description="Anonymized hotspot view showing where severe and recent reports are clustering."
        />
      ),
    },
    {
      id: "knowledge",
      label: "Knowledge Base",
      content: (
        <KnowledgeBasePanel
          title="Farmer knowledge base"
          description="Practical outbreak prevention guides, safe handling steps, and crop or livestock response tips."
        />
      ),
    },
  ];

  return (
    <DashboardShell
      title="Farmer dashboard"
      subtitle="Log livestock, crop, or environmental warning signs and stay ahead of local outbreaks."
      quickActions={data.quickActions}
      showQuickActions={false}
    >
      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <DashboardTabs tabs={tabs} defaultTab="report-center" storageKey="fg-dashboard-tab-farmer" />

      {isLoading ? <div className="dashboard-banner">Loading latest dashboard data...</div> : null}
    </DashboardShell>
  );
}
