import { useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_RISK_MAP = {
  bounds: {
    minLatitude: -4.75,
    maxLatitude: 4.75,
    minLongitude: 33.9,
    maxLongitude: 41.95,
  },
  summary: {
    days: 30,
    reportType: "ALL",
    reportCount: 0,
    hotspotCount: 0,
    estimatedHotspotCount: 0,
    highestRiskScore: 0,
    bands: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  },
  hotspots: [],
  topHotspots: [],
};

export function useRiskMapData(filters) {
  const [data, setData] = useState(EMPTY_RISK_MAP);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadRiskMap() {
      setIsLoading(true);

      try {
        const query = new URLSearchParams({
          days: String(filters.days || 30),
          reportType: filters.reportType || "ALL",
        });
        const response = await apiGet(`/api/dashboard/risk-map?${query.toString()}`, { auth: true });

        if (!isCancelled) {
          setData(response || EMPTY_RISK_MAP);
          setError("");
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(extractApiErrorMessage(loadError, "Unable to load risk map data."));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRiskMap();

    return () => {
      isCancelled = true;
    };
  }, [filters.days, filters.reportType]);

  return {
    data,
    isLoading,
    error,
  };
}
