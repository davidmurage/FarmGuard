import { useCallback, useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_ANALYTICS = {
  generatedAt: "",
  period: "monthly",
  intervals: 6,
  rangeLabel: "",
  totals: {
    totalReports: 0,
    highRiskReports: 0,
    verifiedReports: 0,
    resolvedReports: 0,
    activeAlertCount: 0,
    verificationRate: 0,
    resolutionRate: 0,
    highRiskRate: 0,
  },
  trendBuckets: [],
  reportTypeBreakdown: [],
  severityBreakdown: [],
  statusBreakdown: [],
  topCounties: [],
  recentHighlights: [],
  insights: [],
};

export function useAnalyticsData({ period = "monthly", intervals = 6 } = {}) {
  const [data, setData] = useState({
    ...EMPTY_ANALYTICS,
    period,
    intervals,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);

    try {
      const query = new URLSearchParams({
        period,
        intervals: String(intervals),
      });
      const response = await apiGet(`/api/analytics/overview?${query.toString()}`, {
        auth: true,
      });

      setData(response || {
        ...EMPTY_ANALYTICS,
        period,
        intervals,
      });
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load analytics data."));
    } finally {
      setIsLoading(false);
    }
  }, [period, intervals]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    data,
    isLoading,
    error,
    reload: loadAnalytics,
    setData,
  };
}
