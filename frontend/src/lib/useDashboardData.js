import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_DASHBOARD = {
  role: "FARMER",
  summaryCards: [],
  recentReports: [],
  activeAlerts: [],
  quickActions: [],
};

export function useDashboardData() {
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/dashboard/overview", { auth: true });
      setData(response || EMPTY_DASHBOARD);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load dashboard data."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return {
    data,
    isLoading,
    error,
    reload: loadDashboard,
    setData,
  };
}
