import { useEffect, useId, useState } from "react";

function readInitialTab({ tabs, defaultTab, storageKey }) {
  const fallbackTab = tabs.find((tab) => tab.id === defaultTab)?.id || tabs[0]?.id || "";

  if (!storageKey || typeof window === "undefined") {
    return fallbackTab;
  }

  const storedTab = window.localStorage.getItem(storageKey);
  return tabs.some((tab) => tab.id === storedTab) ? storedTab : fallbackTab;
}

export default function DashboardTabs({ tabs, defaultTab, storageKey }) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState(() => readInitialTab({ tabs, defaultTab, storageKey }));
  const fallbackTab = tabs.find((tab) => tab.id === defaultTab)?.id || tabs[0]?.id || "";
  const [mountedTabs, setMountedTabs] = useState(() => new Set([readInitialTab({ tabs, defaultTab, storageKey })]));

  useEffect(() => {
    if (!tabs.length) {
      return;
    }

    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(fallbackTab);
    }
  }, [activeTab, fallbackTab, tabs]);

  useEffect(() => {
    if (!tabs.length || !storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey, tabs.length]);

  useEffect(() => {
    setMountedTabs((current) => {
      if (current.has(activeTab)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  if (!tabs.length) {
    return null;
  }

  return (
    <section className="dashboard-tabs">
      <div className="dashboard-tab-list" role="tablist" aria-label="Dashboard sections">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabId = `${baseId}-${tab.id}-tab`;
          const panelId = `${baseId}-${tab.id}-panel`;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={isActive}
              aria-controls={panelId}
              className={`dashboard-tab ${isActive ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const tabId = `${baseId}-${tab.id}-tab`;
        const panelId = `${baseId}-${tab.id}-panel`;
        const shouldRenderContent = !tab.lazy || mountedTabs.has(tab.id);

        return (
          <section
            key={tab.id}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            className="dashboard-tab-panel"
            hidden={tab.id !== activeTab}
          >
            {shouldRenderContent ? tab.content : null}
          </section>
        );
      })}
    </section>
  );
}
