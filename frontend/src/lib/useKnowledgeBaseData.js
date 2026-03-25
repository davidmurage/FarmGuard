import { useCallback, useEffect, useState } from "react";

import { apiGet, extractApiErrorMessage } from "./api";

const EMPTY_STATE = {
  articles: [],
  recommendedArticles: [],
  context: {
    role: "FARMER",
    focusReportTypes: [],
    focusCounties: [],
    activeAlertCount: 0,
  },
};

export function useKnowledgeBaseData(filters) {
  const [data, setData] = useState(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadKnowledgeBase = useCallback(async () => {
    setIsLoading(true);

    try {
      const query = new URLSearchParams();

      if (filters.category && filters.category !== "ALL") {
        query.set("category", filters.category);
      }

      if (filters.reportType && filters.reportType !== "ALL") {
        query.set("reportType", filters.reportType);
      }

      if (filters.search?.trim()) {
        query.set("search", filters.search.trim());
      }

      const libraryPath = query.size ? `/api/knowledge?${query.toString()}` : "/api/knowledge";
      const [libraryResponse, recommendationsResponse] = await Promise.all([
        apiGet(libraryPath, { auth: true }),
        apiGet("/api/knowledge/recommendations", { auth: true }),
      ]);

      setData({
        articles: libraryResponse?.articles || [],
        recommendedArticles: recommendationsResponse?.recommendedArticles || [],
        context: recommendationsResponse?.context || EMPTY_STATE.context,
      });
      setError("");
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, "Unable to load the knowledge base."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.reportType, filters.search]);

  useEffect(() => {
    loadKnowledgeBase();
  }, [loadKnowledgeBase]);

  return {
    data,
    isLoading,
    error,
    reload: loadKnowledgeBase,
  };
}
