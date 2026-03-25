import { useEffect, useState } from "react";

import { getAuth, subscribe } from "../../lib/authStore";
import QuickActionsPanel from "./QuickActionsPanel";
import "../../styles/Dashboard.css";

export default function DashboardShell({ title, subtitle, quickActions = [], showQuickActions = true, children }) {
  const [auth, setAuth] = useState(getAuth());

  useEffect(() => subscribe(setAuth), []);

  return (
    <main className="container dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">FarmGuard Workspace</p>
          <h1>{title}</h1>
          <p className="dashboard-subtitle">{subtitle}</p>
        </div>

        <div className="dashboard-identity">
          <span className="dashboard-role">{auth.user?.role || "USER"}</span>
          <strong>{auth.user?.name || "FarmGuard User"}</strong>
          <span>{auth.user?.email || "Signed in"}</span>
        </div>
      </section>

      {showQuickActions ? <QuickActionsPanel quickActions={quickActions} /> : null}

      {children}
    </main>
  );
}
