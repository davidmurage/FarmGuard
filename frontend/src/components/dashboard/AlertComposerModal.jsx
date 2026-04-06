import { useEffect } from "react";

export default function AlertComposerModal({
  open,
  mode = "create",
  form,
  message,
  isPublishing,
  onChange,
  onClose,
  onSubmit,
}) {
  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !isPublishing) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPublishing, onClose, open]);

  if (!open) {
    return null;
  }

  const heading = mode === "edit" ? "Edit alert" : "Publish an alert";
  const submitLabel = mode === "edit" ? "Save changes" : "Publish alert";
  const busyLabel = mode === "edit" ? "Saving..." : "Publishing...";

  return (
    <div
      className="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-composer-title"
      onClick={() => {
        if (!isPublishing) {
          onClose();
        }
      }}
    >
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2 id="alert-composer-title">{heading}</h2>
            <p>Send targeted guidance to the right audience without leaving the alerts workspace.</p>
          </div>
          <button type="button" className="modal-close" aria-label="Close alert composer" onClick={onClose} disabled={isPublishing}>
            Close
          </button>
        </div>

        <form className="dashboard-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              <span>Title</span>
              <input className="input" name="title" value={form.title} onChange={onChange} placeholder="High anthrax risk advisory" />
            </label>

            <label>
              <span>Location</span>
              <input className="input" name="locationName" value={form.locationName} onChange={onChange} placeholder="Nyandarua North" />
            </label>
          </div>

          <label>
            <span>Message</span>
            <textarea className="textarea" name="message" value={form.message} onChange={onChange} placeholder="Describe the risk, affected area, and what teams should do next." />
          </label>

          <div className="form-grid">
            <label>
              <span>Category</span>
              <input className="input" name="category" value={form.category} onChange={onChange} placeholder="Disease" />
            </label>

            <label>
              <span>Risk level</span>
              <select className="input select" name="riskLevel" value={form.riskLevel} onChange={onChange}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Audience</span>
              <select className="input select" name="targetRoles" value={form.targetRoles} onChange={onChange}>
                <option value="ALL">All users</option>
                <option value="FARMER">Farmers</option>
                <option value="VET">Vets</option>
                <option value="ADMIN">Admins</option>
                <option value="PARTNER">Partners</option>
              </select>
            </label>

            <label>
              <span>Action items</span>
              <input className="input" name="actionItems" value={form.actionItems} onChange={onChange} placeholder="isolate livestock, contact field vet, sample affected soil" />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isPublishing}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPublishing}>
              {isPublishing ? busyLabel : submitLabel}
            </button>
          </div>

          {message ? <div className="dashboard-banner">{message}</div> : null}
        </form>
      </section>
    </div>
  );
}
