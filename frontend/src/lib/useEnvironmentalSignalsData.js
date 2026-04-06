import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

export function useEnvironmentalSignalsData() {
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSignals() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/environmental-signals?limit=50", { auth: true });
      setSignals(response?.signals || []);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load environmental signals."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
  }, []);

  return {
    signals,
    isLoading,
    error,
    reload: loadSignals,
  };
}
