import { useState } from "react";

import AlertComposerModal from "../../components/dashboard/AlertComposerModal";
import AlertTable from "../../components/dashboard/AlertTable";
import AnalyticsPanel from "../../components/dashboard/AnalyticsPanel";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardTabs from "../../components/dashboard/DashboardTabs";
import EnvironmentalBriefPanel from "../../components/dashboard/EnvironmentalBriefPanel";
import EnvironmentalSignalComposerModal from "../../components/dashboard/EnvironmentalSignalComposerModal";
import EnvironmentalSignalTable from "../../components/dashboard/EnvironmentalSignalTable";
import KnowledgeBasePanel from "../../components/dashboard/KnowledgeBasePanel";
import QuickActionsPanel from "../../components/dashboard/QuickActionsPanel";
import ReportList from "../../components/dashboard/ReportList";
import RiskMapPanel from "../../components/dashboard/RiskMapPanel";
import SummaryCard from "../../components/dashboard/SummaryCard";
import { apiDelete, apiPatch, apiPost, extractApiErrorMessage } from "../../lib/api";
import { useAdminAlertsData } from "../../lib/useAdminAlertsData";
import { useDashboardData } from "../../lib/useDashboardData";
import { useEnvironmentalSignalsData } from "../../lib/useEnvironmentalSignalsData";

const INITIAL_ALERT = {
  title: "",
  message: "",
  locationName: "",
  category: "Disease",
  riskLevel: "HIGH",
  targetRoles: "ALL",
  actionItems: "",
};

const INITIAL_SIGNAL = {
  county: "",
  locationName: "",
  sourceType: "MANUAL_ENTRY",
  rainfallMm: "",
  humidityPct: "",
  temperatureC: "",
  vegetationIndex: "",
  soilMoisturePct: "",
  notes: "",
  capturedAt: "",
};

function buildAlertForm(alert) {
  return {
    title: alert.title || "",
    message: alert.message || "",
    locationName: alert.locationName || "",
    category: alert.category || "Disease",
    riskLevel: alert.riskLevel || "HIGH",
    targetRoles: alert.targetRoles?.[0] || "ALL",
    actionItems: (alert.actionItems || []).join(", "),
  };
}

export default function AdminDashboard() {
  const { data, isLoading, error, reload } = useDashboardData();
  const {
    alerts: managedAlerts,
    isLoading: areAlertsLoading,
    error: alertsError,
    reload: reloadAlerts,
  } = useAdminAlertsData();
  const {
    signals,
    isLoading: areSignalsLoading,
    error: signalsError,
    reload: reloadSignals,
  } = useEnvironmentalSignalsData();
  const [form, setForm] = useState(INITIAL_ALERT);
  const [signalForm, setSignalForm] = useState(INITIAL_SIGNAL);
  const [composerMessage, setComposerMessage] = useState("");
  const [alertCenterMessage, setAlertCenterMessage] = useState("");
  const [signalComposerMessage, setSignalComposerMessage] = useState("");
  const [environmentalMessage, setEnvironmentalMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingSignal, setIsSavingSignal] = useState(false);
  const [isTrainingModel, setIsTrainingModel] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSignalComposerOpen, setIsSignalComposerOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [editingSignal, setEditingSignal] = useState(null);
  const [processingAlertId, setProcessingAlertId] = useState("");
  const [processingAction, setProcessingAction] = useState("");
  const [processingSignalId, setProcessingSignalId] = useState("");
  const [environmentalBriefVersion, setEnvironmentalBriefVersion] = useState(0);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onSignalChange = (event) => {
    const { name, value } = event.target;
    setSignalForm((current) => ({ ...current, [name]: value }));
  };

  const openComposer = () => {
    setEditingAlert(null);
    setForm(INITIAL_ALERT);
    setComposerMessage("");
    setAlertCenterMessage("");
    setIsComposerOpen(true);
  };

  const openSignalComposer = () => {
    setEditingSignal(null);
    setSignalForm(INITIAL_SIGNAL);
    setSignalComposerMessage("");
    setEnvironmentalMessage("");
    setIsSignalComposerOpen(true);
  };

  const openEditComposer = (alert) => {
    setEditingAlert(alert);
    setForm(buildAlertForm(alert));
    setComposerMessage("");
    setAlertCenterMessage("");
    setIsComposerOpen(true);
  };

  const openEditSignalComposer = (signal) => {
    setEditingSignal(signal);
    setSignalForm({
      county: signal.county || "",
      locationName: signal.locationName || "",
      sourceType: signal.sourceType || "MANUAL_ENTRY",
      rainfallMm: signal.rainfallMm != null ? String(signal.rainfallMm) : "",
      humidityPct: signal.humidityPct != null ? String(signal.humidityPct) : "",
      temperatureC: signal.temperatureC != null ? String(signal.temperatureC) : "",
      vegetationIndex: signal.vegetationIndex != null ? String(signal.vegetationIndex) : "",
      soilMoisturePct: signal.soilMoisturePct != null ? String(signal.soilMoisturePct) : "",
      notes: signal.notes || "",
      capturedAt: signal.capturedAt ? new Date(signal.capturedAt).toISOString().slice(0, 16) : "",
    });
    setSignalComposerMessage("");
    setEnvironmentalMessage("");
    setIsSignalComposerOpen(true);
  };

  const closeComposer = () => {
    if (isPublishing) {
      return;
    }

    setIsComposerOpen(false);
    setEditingAlert(null);
    setForm(INITIAL_ALERT);
    setComposerMessage("");
  };

  const closeSignalComposer = () => {
    if (isSavingSignal) {
      return;
    }

    setIsSignalComposerOpen(false);
    setEditingSignal(null);
    setSignalForm(INITIAL_SIGNAL);
    setSignalComposerMessage("");
  };

  const publishAlert = async (event) => {
    event.preventDefault();
    setIsPublishing(true);
    setComposerMessage("");

    try {
      const payload = {
        ...form,
        targetRoles: [form.targetRoles],
        actionItems: form.actionItems
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editingAlert) {
        await apiPatch(`/api/alerts/${editingAlert.id}`, payload, { auth: true });
        setAlertCenterMessage("Alert updated successfully.");
      } else {
        await apiPost("/api/alerts", payload, { auth: true });
        setAlertCenterMessage("Alert published successfully.");
      }

      setForm(INITIAL_ALERT);
      setEditingAlert(null);
      setIsComposerOpen(false);
      await Promise.all([reload(), reloadAlerts()]);
    } catch (publishError) {
      setComposerMessage(extractApiErrorMessage(publishError, editingAlert ? "Unable to update alert." : "Unable to publish alert."));
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleAlertActive = async (alert) => {
    const actionLabel = alert.isActive ? "deactivate" : "activate";
    const confirmed = window.confirm(`${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} "${alert.title}"?`);

    if (!confirmed) {
      return;
    }

    setProcessingAlertId(alert.id);
    setProcessingAction("toggle");
    setAlertCenterMessage("");

    try {
      await apiPatch(`/api/alerts/${alert.id}`, { isActive: !alert.isActive }, { auth: true });
      setAlertCenterMessage(alert.isActive ? "Alert deactivated successfully." : "Alert reactivated successfully.");

      if (editingAlert?.id === alert.id && alert.isActive) {
        closeComposer();
      }

      await Promise.all([reload(), reloadAlerts()]);
    } catch (toggleError) {
      setAlertCenterMessage(extractApiErrorMessage(toggleError, "Unable to update alert status."));
    } finally {
      setProcessingAlertId("");
      setProcessingAction("");
    }
  };

  const deleteAlert = async (alert) => {
    const confirmed = window.confirm(`Delete "${alert.title}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setProcessingAlertId(alert.id);
    setProcessingAction("delete");
    setAlertCenterMessage("");

    try {
      await apiDelete(`/api/alerts/${alert.id}`, { auth: true });
      setAlertCenterMessage("Alert deleted successfully.");

      if (editingAlert?.id === alert.id) {
        closeComposer();
      }

      await Promise.all([reload(), reloadAlerts()]);
    } catch (deleteError) {
      setAlertCenterMessage(extractApiErrorMessage(deleteError, "Unable to delete alert."));
    } finally {
      setProcessingAlertId("");
      setProcessingAction("");
    }
  };

  const saveEnvironmentalSignal = async (event) => {
    event.preventDefault();
    setIsSavingSignal(true);
    setSignalComposerMessage("");

    try {
      const payload = {
        ...signalForm,
        rainfallMm: signalForm.rainfallMm === "" ? 0 : Number(signalForm.rainfallMm),
        humidityPct: signalForm.humidityPct === "" ? 0 : Number(signalForm.humidityPct),
        temperatureC: signalForm.temperatureC === "" ? 0 : Number(signalForm.temperatureC),
        vegetationIndex: signalForm.vegetationIndex === "" ? 50 : Number(signalForm.vegetationIndex),
        soilMoisturePct: signalForm.soilMoisturePct === "" ? 50 : Number(signalForm.soilMoisturePct),
        capturedAt: signalForm.capturedAt || undefined,
      };

      if (editingSignal) {
        await apiPatch(`/api/environmental-signals/${editingSignal.id}`, payload, { auth: true });
        setEnvironmentalMessage("Environmental signal updated successfully.");
      } else {
        await apiPost("/api/environmental-signals", payload, { auth: true });
        setEnvironmentalMessage("Environmental signal logged successfully.");
      }

      setSignalForm(INITIAL_SIGNAL);
      setEditingSignal(null);
      setIsSignalComposerOpen(false);
      await reloadSignals();
      setEnvironmentalBriefVersion((current) => current + 1);
    } catch (saveError) {
      setSignalComposerMessage(extractApiErrorMessage(saveError, editingSignal ? "Unable to update environmental signal." : "Unable to log environmental signal."));
    } finally {
      setIsSavingSignal(false);
    }
  };

  const deleteEnvironmentalSignal = async (signal) => {
    const confirmed = window.confirm(`Delete the environmental signal for "${signal.county}" captured on ${new Date(signal.capturedAt).toLocaleString()}?`);

    if (!confirmed) {
      return;
    }

    setProcessingSignalId(signal.id);
    setEnvironmentalMessage("");

    try {
      await apiDelete(`/api/environmental-signals/${signal.id}`, { auth: true });
      setEnvironmentalMessage("Environmental signal deleted successfully.");

      if (editingSignal?.id === signal.id) {
        closeSignalComposer();
      }

      await reloadSignals();
      setEnvironmentalBriefVersion((current) => current + 1);
    } catch (deleteError) {
      setEnvironmentalMessage(extractApiErrorMessage(deleteError, "Unable to delete environmental signal."));
    } finally {
      setProcessingSignalId("");
    }
  };

  const retrainEnvironmentalModel = async () => {
    setIsTrainingModel(true);
    setEnvironmentalMessage("");

    try {
      const response = await apiPost("/api/environmental-model/train", {}, { auth: true });
      const modelVersion = response?.model?.modelVersion ? ` (${response.model.modelVersion})` : "";

      setEnvironmentalMessage(`Environmental model retrained successfully${modelVersion}.`);
      setEnvironmentalBriefVersion((current) => current + 1);
    } catch (trainingError) {
      setEnvironmentalMessage(extractApiErrorMessage(trainingError, "Unable to retrain the environmental model."));
    } finally {
      setIsTrainingModel(false);
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
      id: "analytics",
      label: "Analytics",
      content: <AnalyticsPanel />,
    },
    {
      id: "environmental-intel",
      label: "Environmental Intel",
      lazy: true,
      content: (
        <>
          <section className="dashboard-panel dashboard-panel-wide dashboard-launch-panel">
            <div className="panel-head">
              <div>
                <h2>Manage environmental signals</h2>
                <p>Capture rainfall, humidity, heat, vegetation, and soil conditions so FarmGuard can score county pressure earlier.</p>
              </div>
              <div className="panel-head-actions">
                <button type="button" className="btn btn-outline" onClick={retrainEnvironmentalModel} disabled={isTrainingModel}>
                  {isTrainingModel ? "Training..." : "Retrain model"}
                </button>
                <button type="button" className="btn btn-primary" onClick={openSignalComposer}>
                  Log signal
                </button>
              </div>
            </div>
            <p className="dashboard-launch-note">
              These entries feed the Python-backed ML brief and help explain where early-warning risk is rising before outbreaks spread.
            </p>
            {environmentalMessage ? <div className="dashboard-banner">{environmentalMessage}</div> : null}
            {signalsError ? <div className="dashboard-banner dashboard-banner-error">{signalsError}</div> : null}
          </section>

          <EnvironmentalBriefPanel
            title="ML environmental risk brief"
            description="County-level recommendations generated by the Python scoring layer from environmental signals and recent FarmGuard reports."
            refreshToken={environmentalBriefVersion}
          />

          <EnvironmentalSignalTable
            signals={signals}
            onEdit={openEditSignalComposer}
            onDelete={deleteEnvironmentalSignal}
            processingSignalId={processingSignalId}
          />

          {areSignalsLoading ? <div className="dashboard-banner">Loading environmental signals...</div> : null}

          <EnvironmentalSignalComposerModal
            open={isSignalComposerOpen}
            mode={editingSignal ? "edit" : "create"}
            form={signalForm}
            message={signalComposerMessage}
            isSaving={isSavingSignal}
            onChange={onSignalChange}
            onClose={closeSignalComposer}
            onSubmit={saveEnvironmentalSignal}
          />
        </>
      ),
    },
    {
      id: "alerts",
      label: "Alerts",
      content: (
        <>
          <section className="dashboard-panel dashboard-panel-wide dashboard-launch-panel">
            <div className="panel-head">
              <div>
                <h2>Manage alerts</h2>
                <p>Publish targeted response instructions from a focused popout, then review all active advisories in one table.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={openComposer}>
                Publish alert
              </button>
            </div>
            <p className="dashboard-launch-note">
              Use the alert composer for new advisories, then scan and manage published alerts below by risk, status, audience, and location.
            </p>
            {alertCenterMessage ? <div className="dashboard-banner">{alertCenterMessage}</div> : null}
            {alertsError ? <div className="dashboard-banner dashboard-banner-error">{alertsError}</div> : null}
          </section>

          <AlertTable
            alerts={managedAlerts}
            title="Published alerts"
            description="Manage active and inactive advisories across the platform."
            onEdit={openEditComposer}
            onToggleActive={toggleAlertActive}
            onDelete={deleteAlert}
            processingAlertId={processingAlertId}
            processingAction={processingAction}
          />
          {areAlertsLoading ? <div className="dashboard-banner">Loading published alerts...</div> : null}
          <AlertComposerModal
            open={isComposerOpen}
            mode={editingAlert ? "edit" : "create"}
            form={form}
            message={composerMessage}
            isPublishing={isPublishing}
            onChange={onChange}
            onClose={closeComposer}
            onSubmit={publishAlert}
          />
        </>
      ),
    },
    {
      id: "risk-map",
      label: "Risk Map",
      lazy: true,
      content: (
        <RiskMapPanel
          title="National risk heatmap"
          description="See where verified and active incident pressure is clustering before publishing wider alerts."
        />
      ),
    },
    {
      id: "knowledge",
      label: "Knowledge Base",
      content: (
        <KnowledgeBasePanel
          title="Knowledge base management"
          description="Review recommended guidance, browse the library, and publish new operational articles."
          allowPublish
        />
      ),
    },
    {
      id: "reports",
      label: "Reports",
      content: (
        <ReportList
          reports={data.recentReports}
          title="System-wide recent reports"
          description="Track the latest signals entering the platform across all operational roles."
        />
      ),
    },
  ];

  return (
    <DashboardShell
      title="Admin command dashboard"
      subtitle="Monitor platform-wide signals, publish advisories, and coordinate system response."
      quickActions={data.quickActions}
      showQuickActions={false}
    >
      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <DashboardTabs tabs={tabs} defaultTab="analytics" storageKey="fg-dashboard-tab-admin" />

      {isLoading ? <div className="dashboard-banner">Loading latest dashboard data...</div> : null}
    </DashboardShell>
  );
}
