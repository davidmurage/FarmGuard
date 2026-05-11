import { useEffect, useState } from "react";

import { apiPatch, extractApiErrorMessage } from "../../lib/api";
import { getAuth, setAuth, subscribe } from "../../lib/authStore";

function buildForm(user) {
  return {
    phoneNumber: user?.phoneNumber || "",
    notificationPreferences: {
      sms: Boolean(user?.notificationPreferences?.sms),
      whatsapp: Boolean(user?.notificationPreferences?.whatsapp),
      inApp: user?.notificationPreferences?.inApp ?? true,
    },
  };
}

export default function NotificationSettingsPanel({
  title = "Notification settings",
  description = "Choose which channels FarmGuard can use when alerts need to reach you quickly.",
}) {
  const [session, setSession] = useState(getAuth());
  const [form, setForm] = useState(buildForm(getAuth().user));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribe(setSession), []);

  useEffect(() => {
    setForm(buildForm(session.user));
  }, [session.user]);

  if (!session.user || !session.token) {
    return null;
  }

  const requiresPhone =
    (form.notificationPreferences.sms || form.notificationPreferences.whatsapp) &&
    !form.phoneNumber.trim();

  const onChange = (event) => {
    const { name, type, checked, value } = event.target;

    if (["sms", "whatsapp", "inApp"].includes(name)) {
      setForm((current) => ({
        ...current,
        notificationPreferences: {
          ...current.notificationPreferences,
          [name]: checked,
        },
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (requiresPhone) {
      setBusy(false);
      setMessage("Add a phone number before enabling SMS or WhatsApp alerts.");
      return;
    }

    try {
      const response = await apiPatch(
        "/api/auth/me",
        {
          phoneNumber: form.phoneNumber,
          notificationPreferences: form.notificationPreferences,
        },
        { auth: true },
      );

      setAuth({ user: response.user, token: session.token });
      setMessage("Notification settings saved.");
    } catch (error) {
      setMessage(extractApiErrorMessage(error, "Unable to save notification settings."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dashboard-panel dashboard-panel-wide notification-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <form className="dashboard-form" onSubmit={submit}>
        <div className="notification-settings-grid">
          <label>
            <span>Phone number</span>
            <input
              className="input"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={onChange}
              placeholder="+254712345678"
            />
          </label>

          <div>
            <span className="settings-group-label">Alert channels</span>
            <div className="checkbox-stack checkbox-stack-compact">
              <label className="checkbox-option">
                <input type="checkbox" name="sms" checked={form.notificationPreferences.sms} onChange={onChange} />
                <div>
                  <strong>SMS</strong>
                  <span>Get urgent text alerts on your saved phone number.</span>
                </div>
              </label>

              <label className="checkbox-option">
                <input type="checkbox" name="whatsapp" checked={form.notificationPreferences.whatsapp} onChange={onChange} />
                <div>
                  <strong>WhatsApp</strong>
                  <span>Use the same phone number for WhatsApp advisories.</span>
                </div>
              </label>

              <label className="checkbox-option">
                <input type="checkbox" name="inApp" checked={form.notificationPreferences.inApp} onChange={onChange} />
                <div>
                  <strong>In-app</strong>
                  <span>Keep alerts visible inside your FarmGuard dashboard.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <p className="settings-note">
          Use an international number format. FarmGuard keeps dashboard alerts available even when SMS or WhatsApp are turned off.
        </p>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save settings"}
          </button>
        </div>

        {message ? <div className="dashboard-banner">{message}</div> : null}
      </form>
    </section>
  );
}
