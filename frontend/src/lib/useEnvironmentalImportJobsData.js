import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

export function useEnvironmentalImportJobsData() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadJobs() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/environmental-signals/import-jobs", { auth: true });
      setJobs(response?.jobs || []);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load environmental import history."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  return {
    jobs,
    isLoading,
    error,
    reload: loadJobs,
  };
}
