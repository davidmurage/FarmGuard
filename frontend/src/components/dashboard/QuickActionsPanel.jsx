export default function QuickActionsPanel({ quickActions = [] }) {
  if (!quickActions.length) {
    return null;
  }

  return (
    <section className="dashboard-panel dashboard-panel-soft">
      <div className="panel-head">
        <div>
          <h2>Recommended next actions</h2>
          <p>Use these prompts to guide the next response cycle.</p>
        </div>
      </div>
      <ul className="action-list">
        {quickActions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
    </section>
  );
}
