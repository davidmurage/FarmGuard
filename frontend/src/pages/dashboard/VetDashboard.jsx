import { useEffect, useState } from "react";

import AlertList from "../../components/dashboard/AlertList";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardTabs from "../../components/dashboard/DashboardTabs";
import EnvironmentalBriefPanel from "../../components/dashboard/EnvironmentalBriefPanel";
import KnowledgeBasePanel from "../../components/dashboard/KnowledgeBasePanel";
import LocalizedRiskPanel from "../../components/dashboard/LocalizedRiskPanel";
import NotificationSettingsPanel from "../../components/dashboard/NotificationSettingsPanel";
import QuickActionsPanel from "../../components/dashboard/QuickActionsPanel";
import ReportList from "../../components/dashboard/ReportList";
import RiskMapPanel from "../../components/dashboard/RiskMapPanel";
import SummaryCard from "../../components/dashboard/SummaryCard";
import { apiGet, apiPatch, extractApiErrorMessage } from "../../lib/api";
import { useDashboardData } from "../../lib/useDashboardData";

const INITIAL_REVIEW = {
  status: "UNDER_REVIEW",
  diagnosis: "",
  notes: "",
  labResultSummary: "",
  recommendedActions: "",
  followUpDate: "",
};

function buildReviewForm(report) {
  return {
    status: report.status === "SUBMITTED" ? "UNDER_REVIEW" : report.status,
    diagnosis: report.review?.diagnosis || "",
    notes: report.review?.notes || "",
    labResultSummary: report.review?.labResultSummary || "",
    recommendedActions: (report.review?.recommendedActions || []).join(", "),
    followUpDate: report.review?.followUpDate ? new Date(report.review.followUpDate).toISOString().slice(0, 10) : "",
  };
}

async function loadVetReviewQueue(preferredReportId, setReviewQueue, setSelectedReportId, setReviewForm, setQueueError) {
  try {
    const response = await apiGet("/api/reports?limit=20", { auth: true });
    const reports = (response?.reports || []).filter((report) => ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(report.status));

    setReviewQueue(reports);
    setQueueError("");

    if (!reports.length) {
      setSelectedReportId("");
      setReviewForm(INITIAL_REVIEW);
      return;
    }

    const activeReport = reports.find((report) => report.id === preferredReportId) || reports[0];
    setSelectedReportId(activeReport.id);
    setReviewForm(buildReviewForm(activeReport));
  } catch (loadError) {
    setQueueError(extractApiErrorMessage(loadError, "Unable to load the review queue."));
  }
}

export default function VetDashboard() {
  const { data, isLoading, error, reload } = useDashboardData();
  const [reviewQueue, setReviewQueue] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [reviewForm, setReviewForm] = useState(INITIAL_REVIEW);
  const [queueError, setQueueError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadVetReviewQueue("", setReviewQueue, setSelectedReportId, setReviewForm, setQueueError);
  }, []);

  const selectedReport = reviewQueue.find((report) => report.id === selectedReportId) || null;

  const selectReport = (report) => {
    setSelectedReportId(report.id);
    setReviewForm(buildReviewForm(report));
    setReviewMessage("");
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((current) => ({ ...current, [name]: value }));
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!selectedReport) {
      setReviewMessage("Choose a report to review first.");
      return;
    }

    setIsSubmitting(true);
    setReviewMessage("");

    try {
      await apiPatch(
        `/api/reports/${selectedReport.id}/review`,
        {
          status: reviewForm.status,
          diagnosis: reviewForm.diagnosis,
          notes: reviewForm.notes,
          labResultSummary: reviewForm.labResultSummary,
          recommendedActions: reviewForm.recommendedActions
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          followUpDate: reviewForm.followUpDate || null,
        },
        { auth: true },
      );

      setReviewMessage("Review saved successfully.");
      await Promise.all([
        reload(),
        loadVetReviewQueue(selectedReport.id, setReviewQueue, setSelectedReportId, setReviewForm, setQueueError),
      ]);
    } catch (submitError) {
      setReviewMessage(extractApiErrorMessage(submitError, "Unable to save review."));
    } finally {
      setIsSubmitting(false);
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
      id: "profile",
      label: "Profile",
      content: (
        <NotificationSettingsPanel
          title="Vet profile"
          description="Keep your account details, contact number, alert channels, and password current for field response work."
        />
      ),
    },
    {
      id: "review-queue",
      label: "Review Queue",
      content: (
        <section className="dashboard-layout">
          <ReportList
            reports={reviewQueue}
            title="Vet review queue"
            description="Open cases from farmers and field teams that need review or follow-up."
            isSelected={(report) => report.id === selectedReportId}
            renderFooter={(report) => (
              <button type="button" className="btn btn-outline btn-inline" onClick={() => selectReport(report)}>
                {report.id === selectedReportId ? "Selected" : "Review case"}
              </button>
            )}
          />

          <section className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Review selected case</h2>
                <p>Capture the diagnosis, field notes, and the next follow-up action.</p>
              </div>
            </div>

            {selectedReport ? (
              <form className="dashboard-form" onSubmit={submitReview}>
                <div className="review-highlight">
                  <strong>{selectedReport.title}</strong>
                  <span>{selectedReport.location?.name || "Unknown location"} - {selectedReport.status}</span>
                </div>

                <div className="form-grid">
                  <label>
                    <span>Status</span>
                    <select className="input select" name="status" value={reviewForm.status} onChange={onChange}>
                      <option value="UNDER_REVIEW">Under review</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </label>

                  <label>
                    <span>Follow-up date</span>
                    <input className="input" type="date" name="followUpDate" value={reviewForm.followUpDate} onChange={onChange} />
                  </label>
                </div>

                <label>
                  <span>Diagnosis</span>
                  <input className="input" name="diagnosis" value={reviewForm.diagnosis} onChange={onChange} placeholder="Suspected mastitis outbreak with secondary infection risk" />
                </label>

                <label>
                  <span>Field notes</span>
                  <textarea className="textarea" name="notes" value={reviewForm.notes} onChange={onChange} placeholder="Describe what you validated on site, what remains uncertain, and what should be monitored next." />
                </label>

                <label>
                  <span>Lab or test summary</span>
                  <textarea className="textarea" name="labResultSummary" value={reviewForm.labResultSummary} onChange={onChange} placeholder="Optional summary of samples, rapid tests, or lab observations." />
                </label>

                <label>
                  <span>Recommended actions</span>
                  <input className="input" name="recommendedActions" value={reviewForm.recommendedActions} onChange={onChange} placeholder="isolate affected animals, disinfect pens, notify local extension officer" />
                </label>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save review"}
                  </button>
                </div>

                {reviewMessage ? <div className="dashboard-banner">{reviewMessage}</div> : null}
              </form>
            ) : (
              <div className="empty-state">No reports are waiting in the vet review queue right now.</div>
            )}
          </section>
        </section>
      ),
    },
    {
      id: "alerts",
      label: "Alerts",
      content: (
        <section className="dashboard-layout">
          <AlertList alerts={data.activeAlerts} />

          <section className="dashboard-panel">
            <div className="panel-head">
              <div>
                <h2>Field response checklist</h2>
                <p>Use a consistent triage loop when incidents escalate quickly.</p>
              </div>
            </div>
            <ul className="action-list">
              <li>Validate severity with on-site inspection or recent lab results.</li>
              <li>Escalate high-risk signals to admins for broader regional alerts.</li>
              <li>Document preventive advice and next review dates for each case.</li>
              <li>Track whether the incident affects livestock, crops, or both.</li>
            </ul>
          </section>
        </section>
      ),
    },
    {
      id: "risk-scores",
      label: "Risk Scores",
      content: (
        <LocalizedRiskPanel
          title="Localized field risk scores"
          description="Use the 0-100 county score view to see where livestock or crop pressure is intensifying before field deployment."
        />
      ),
    },
    {
      id: "environmental-intel",
      label: "Environmental Intel",
      lazy: true,
      content: (
        <EnvironmentalBriefPanel
          title="Field environmental intelligence"
          description="Use the Python scoring layer to blend county conditions with incoming case pressure so field teams can prioritize surveillance and follow-up."
        />
      ),
    },
    {
      id: "risk-map",
      label: "Risk Map",
      lazy: true,
      content: (
        <RiskMapPanel
          title="Operational risk heatmap"
          description="Track where incident pressure is rising so field teams can prioritize visits and verification."
        />
      ),
    },
    {
      id: "knowledge",
      label: "Knowledge Base",
      content: (
        <KnowledgeBasePanel
          title="Vet field library"
          description="Reference guides for verification, containment, and practical recommendations you can pass back to farmers."
        />
      ),
    },
  ];

  return (
    <DashboardShell
      title="Vet and field officer dashboard"
      subtitle="Review incoming incidents, prioritize field response, and coordinate follow-up guidance."
      quickActions={data.quickActions}
      showQuickActions={false}
    >
      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}
      {queueError ? <div className="dashboard-banner dashboard-banner-error">{queueError}</div> : null}

      <DashboardTabs tabs={tabs} defaultTab="review-queue" storageKey="fg-dashboard-tab-vet" />

      {isLoading ? <div className="dashboard-banner">Loading latest dashboard data...</div> : null}
    </DashboardShell>
  );
}


