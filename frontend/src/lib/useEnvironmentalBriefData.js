import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_BRIEF = {
  generatedAt: "",
  signalWindowDays: 14,
  reportWindowDays: 30,
  scoring: {
    engine: "HEURISTIC_FALLBACK",
    label: "Preparing scorer",
    status: "fallback",
    modelVersion: "",
    message: "",
    generatedAt: "",
    trained: false,
    trainedAt: "",
    trainingSamples: 0,
    metrics: {
      accuracy: null,
      loss: null,
    },
  },
  summary: {
    countyCount: 0,
    signalCount: 0,
    reportLinkedCount: 0,
    highRiskCount: 0,
    topCounty: "",
    topRiskScore: 0,
    averageRainfallMm: 0,
    averageVegetationIndex: 0,
    averageRiskProbabilityPct: 0,
    scoringStatus: "fallback",
  },
  counties: [],
};

export function useEnvironmentalBriefData(refreshToken = 0) {
  const [data, setData] = useState(EMPTY_BRIEF);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBrief() {
    setIsLoading(true);

    try {
      const response = await apiGet("/api/dashboard/environmental-brief", { auth: true });
      setData(response || EMPTY_BRIEF);
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load environmental intelligence."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBrief();
  }, [refreshToken]);

  return {
    data,
    isLoading,
    error,
    reload: loadBrief,
  };
}
