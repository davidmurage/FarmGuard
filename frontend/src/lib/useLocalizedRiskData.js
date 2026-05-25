import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_RISK_DATA = {
  generatedAt: "",
  windowDays: 14,
  signalWindowDays: 10,
  summary: {
    countyCount: 0,
    highRiskCountyCount: 0,
    criticalCountyCount: 0,
    highestScore: 0,
    activeDomainCount: 0,
  },
  userCountyScore: null,
  counties: [],
};

export function useLocalizedRiskData() {
  const [data, setData] = useState(EMPTY_RISK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLocalizedRisk() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/dashboard/local-risk-scores", { auth: true });
      setData(response || EMPTY_RISK_DATA);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load localized risk scores."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLocalizedRisk();
  }, []);

  return {
    data,
    isLoading,
    error,
    reload: loadLocalizedRisk,
  };
}
