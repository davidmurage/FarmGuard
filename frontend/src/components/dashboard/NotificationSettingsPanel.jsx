import { useEffect, useState } from "react";

import { apiPatch, extractApiErrorMessage } from "../../lib/api";
import { getAuth, setAuth, subscribe } from "../../lib/authStore";

function buildForm(user) {
  return {
    name: user?.name || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    notificationPreferences: {
      sms: Boolean(user?.notificationPreferences?.sms),
      whatsapp: Boolean(user?.notificationPreferences?.whatsapp),
      inApp: user?.notificationPreferences?.inApp ?? true,
    },
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  };
}

function formatRoleLabel(role) {
  return String(role || "")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function NotificationSettingsPanel({
  title = "Profile settings",
  description = "Update your contact details, alert preferences, and password without leaving the dashboard.",
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

  const activeChannels = [
    form.notificationPreferences.inApp ? "In-app" : null,
    form.notificationPreferences.sms ? "SMS" : null,
    form.notificationPreferences.whatsapp ? "WhatsApp" : null,
  ].filter(Boolean);

  const requiresPhone =
    (form.notificationPreferences.sms || form.notificationPreferences.whatsapp) &&
    !form.phoneNumber.trim();

  const passwordChangeRequested =
    form.currentPassword || form.newPassword || form.confirmNewPassword;

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

    const nextName = form.name.trim();
    const nextEmail = form.email.trim().toLowerCase();

    if (!nextName || !nextEmail) {
      setBusy(false);
      setMessage("Name and email are required.");
      return;
    }

    if (requiresPhone) {
      setBusy(false);
      setMessage("Add a phone number before enabling SMS or WhatsApp alerts.");
      return;
    }

    if (passwordChangeRequested) {
      if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) {
        setBusy(false);
        setMessage("Fill in your current password, new password, and confirmation to change your password.");
        return;
      }

      if (form.newPassword.length < 6) {
        setBusy(false);
        setMessage("New password must be at least 6 characters.");
        return;
      }

      if (form.newPassword !== form.confirmNewPassword) {
        setBusy(false);
        setMessage("New password and confirmation do not match.");
        return;
      }
    }

    try {
      const response = await apiPatch(
        "/api/auth/me",
        {
          name: nextName,
          email: nextEmail,
          phoneNumber: form.phoneNumber,
          notificationPreferences: form.notificationPreferences,
          ...(passwordChangeRequested
            ? {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
              }
            : {}),
        },
        { auth: true },
      );

      setAuth({ user: response.user, token: session.token });
      setForm(buildForm(response.user));
      setMessage(passwordChangeRequested ? "Profile and password updated successfully." : "Profile updated successfully.");
    } catch (error) {
      setMessage(extractApiErrorMessage(error, "Unable to save profile changes."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dashboard-panel dashboard-panel-wide profile-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="profile-meta-row">
        <div className="profile-meta-chip">
          <span>Role</span>
          <strong>{formatRoleLabel(session.user.role)}</strong>
          <small>Your access level stays managed by FarmGuard administrators.</small>
        </div>

        <div className="profile-meta-chip">
          <span>Contact status</span>
          <strong>{form.phoneNumber.trim() ? "Phone saved" : "Phone missing"}</strong>
          <small>{form.phoneNumber.trim() || "Add a number to unlock SMS and WhatsApp delivery."}</small>
        </div>

        <div className="profile-meta-chip">
          <span>Active channels</span>
          <strong>{activeChannels.length ? activeChannels.join(", ") : "None selected"}</strong>
          <small>In-app alerts remain visible from your dashboard tabs.</small>
        </div>
      </div>

      <form className="dashboard-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Full name</span>
            <input className="input" name="name" value={form.name} onChange={onChange} placeholder="Your full name" />
          </label>

          <label>
            <span>Email address</span>
            <input className="input" type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" />
          </label>
        </div>

        <section className="profile-section">
          <div className="profile-section-head">
            <h3>Alert delivery preferences</h3>
            <p>Choose how FarmGuard should reach you when an urgent advisory needs fast action.</p>
          </div>

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
                    <span>Receive urgent text alerts on your saved phone number.</span>
                  </div>
                </label>

                <label className="checkbox-option">
                  <input type="checkbox" name="whatsapp" checked={form.notificationPreferences.whatsapp} onChange={onChange} />
                  <div>
                    <strong>WhatsApp</strong>
                    <span>Use the same saved number for WhatsApp advisories.</span>
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
        </section>

        <section className="profile-section">
          <div className="profile-section-head">
            <h3>Change password</h3>
            <p>Leave these fields blank if you do not want to rotate your password right now.</p>
          </div>

          <div className="form-grid">
            <label>
              <span>Current password</span>
              <input
                className="input"
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={onChange}
                autoComplete="current-password"
                placeholder="Enter your current password"
              />
            </label>

            <label>
              <span>New password</span>
              <input
                className="input"
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={onChange}
                autoComplete="new-password"
                placeholder="Use at least 6 characters"
              />
            </label>
          </div>

          <label>
            <span>Confirm new password</span>
            <input
              className="input"
              type="password"
              name="confirmNewPassword"
              value={form.confirmNewPassword}
              onChange={onChange}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
            />
          </label>
        </section>

        <p className="settings-note">
          Use an international phone number format. Email, phone, notification preferences, and password changes are saved directly to your FarmGuard account.
        </p>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save profile"}
          </button>
        </div>

        {message ? <div className="dashboard-banner">{message}</div> : null}
      </form>
    </section>
  );
}
