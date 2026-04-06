import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_ALERTS = [];

export function useAdminAlertsData() {
  const [alerts, setAlerts] = useState(EMPTY_ALERTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAlerts() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/alerts?scope=manage&limit=50", { auth: true });
      setAlerts(response?.alerts || EMPTY_ALERTS);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load published alerts."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  return {
    alerts,
    isLoading,
    error,
    reload: loadAlerts,
    setAlerts,
  };
}
