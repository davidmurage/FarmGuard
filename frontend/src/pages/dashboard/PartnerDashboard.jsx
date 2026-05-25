import AlertList from "../../components/dashboard/AlertList";
import AnalyticsPanel from "../../components/dashboard/AnalyticsPanel";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardTabs from "../../components/dashboard/DashboardTabs";
import EnvironmentalBriefPanel from "../../components/dashboard/EnvironmentalBriefPanel";
import KnowledgeBasePanel from "../../components/dashboard/KnowledgeBasePanel";
import LocalizedRiskPanel from "../../components/dashboard/LocalizedRiskPanel";
import NotificationSettingsPanel from "../../components/dashboard/NotificationSettingsPanel";
import QuickActionsPanel from "../../components/dashboard/QuickActionsPanel";
import RiskMapPanel from "../../components/dashboard/RiskMapPanel";
import SummaryCard from "../../components/dashboard/SummaryCard";
import { useDashboardData } from "../../lib/useDashboardData";

const PARTNER_AUDIENCE_OPTIONS = [
  { value: "partner", label: "Partner organization" },
];

export default function PartnerDashboard() {
  const { data, isLoading, error } = useDashboardData();

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
          title="Partner profile"
          description="Update your organization contact details, delivery channels, and password for planning coordination."
        />
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      content: (
        <AnalyticsPanel
          title="Partner reporting and analytics"
          description="Use anonymized monthly or quarterly summaries to support planning, grants, logistics, and field coordination."
          defaultAudience="partner"
          audienceOptions={PARTNER_AUDIENCE_OPTIONS}
          reportLabel="planning snapshot"
        />
      ),
    },
    {
      id: "risk-scores",
      label: "Risk Scores",
      content: (
        <LocalizedRiskPanel
          title="County risk score brief"
          description="Review anonymized 0-100 county scores generated from recent livestock and crop signals for planning and support decisions."
        />
      ),
    },
    {
      id: "risk-map",
      label: "Risk Map",
      lazy: true,
      content: (
        <RiskMapPanel
          title="Anonymized hotspot map"
          description="County-level risk clustering for planning outreach, staffing, and preventative support without exposing raw case details."
        />
      ),
    },
    {
      id: "environmental-intel",
      label: "Environmental Intel",
      lazy: true,
      content: (
        <EnvironmentalBriefPanel
          title="Environmental planning brief"
          description="Use the Python-scored county environmental brief and linked report signals to plan outreach, supplies, and prevention support."
        />
      ),
    },
    {
      id: "alerts",
      label: "Alerts",
      content: (
        <AlertList
          alerts={data.activeAlerts}
          title="Partner advisories"
          emptyMessage="No partner-facing advisories are active right now."
        />
      ),
    },
    {
      id: "knowledge",
      label: "Knowledge Base",
      content: (
        <KnowledgeBasePanel
          title="Partner planning library"
          description="Operational references, prevention guidance, and field response material for planning teams and supporting organizations."
        />
      ),
    },
    {
      id: "planning",
      label: "Planning",
      content: (
        <section className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>Planning checklist</h2>
              <p>Use the current FarmGuard signal mix to guide practical support decisions.</p>
            </div>
          </div>
          <ul className="action-list">
            <li>Compare current hotspot counties against ongoing outreach or grant commitments.</li>
            <li>Download quarterly partner exports for donor, ministry, or NGO coordination meetings.</li>
            <li>Use severity and verification trends to prioritize prevention-focused support over late response.</li>
          </ul>
        </section>
      ),
    },
  ];

  return (
    <DashboardShell
      title="Partner organization dashboard"
      subtitle="Review anonymized trend signals, hotspot shifts, and planning guidance for regional response support."
      quickActions={data.quickActions}
      showQuickActions={false}
    >
      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <DashboardTabs tabs={tabs} defaultTab="analytics" storageKey="fg-dashboard-tab-partner" />

      {isLoading ? <div className="dashboard-banner">Loading partner planning data...</div> : null}
    </DashboardShell>
  );
}


