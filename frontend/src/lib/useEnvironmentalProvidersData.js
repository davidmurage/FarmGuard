import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

export function useEnvironmentalProvidersData() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProviders() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/environmental-signals/providers", { auth: true });
      setProviders(response?.providers || []);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load environmental provider status."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  return {
    providers,
    isLoading,
    error,
    reload: loadProviders,
  };
}
