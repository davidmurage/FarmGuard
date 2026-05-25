import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { apiPost, extractApiErrorMessage } from "../lib/api";
import { getAuth, setAuth } from "../lib/authStore";
import { roleHome } from "../utils/auth";
import "../styles/Signup.css";

export default function Signup() {
  const navigate = useNavigate();
  const currentAuth = getAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "FARMER",
    phoneNumber: "",
    county: "",
    locationName: "",
    smsOptIn: true,
    whatsappOptIn: true,
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  if (currentAuth.token && currentAuth.user) {
    return <Navigate to={roleHome(currentAuth.user.role)} replace />;
  }

  const onChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMsg("");

    if (["FARMER", "VET"].includes(form.role) && !form.county.trim()) {
      setBusy(false);
      setMsg("County is required so FarmGuard can send local outbreak warnings to the right area.");
      return;
    }

    try {
      const data = await apiPost("/api/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phoneNumber: form.phoneNumber,
        county: form.county,
        locationName: form.locationName,
        notificationPreferences: {
          sms: form.smsOptIn,
          whatsapp: form.whatsappOptIn,
          inApp: true,
        },
      });
      setAuth({ user: data.user, token: data.token });
      navigate(roleHome(data.user.role), { replace: true });
    } catch (error) {
      setMsg(extractApiErrorMessage(error, "Registration failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <header className="auth-header">
          <h1>Create your account</h1>
          <p className="switch-auth">
            Already have an account?{" "}
            <Link to="/login" className="link">Sign In</Link>
          </p>
        </header>

        <form onSubmit={submit} className="form-card" noValidate>
          <label className="label" htmlFor="name">Full name</label>
          <input
            id="name"
            className="input"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            autoComplete="name"
            placeholder="e.g., Jane Doe"
          />

          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label className="label" htmlFor="county">County</label>
          <input
            id="county"
            className="input"
            name="county"
            value={form.county}
            onChange={onChange}
            autoComplete="address-level1"
            placeholder="e.g., Nakuru"
          />

          <label className="label" htmlFor="locationName">Local area</label>
          <input
            id="locationName"
            className="input"
            name="locationName"
            value={form.locationName}
            onChange={onChange}
            autoComplete="address-level2"
            placeholder="e.g., Molo or ward name"
          />

          <label className="label" htmlFor="phoneNumber">Phone number</label>
          <input
            id="phoneNumber"
            className="input"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={onChange}
            autoComplete="tel"
            placeholder="+254712345678"
          />

          <label className="label" htmlFor="password">Password</label>
          <div className="password-wrap">
            <input
              id="password"
              className="input password-input"
              name="password"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={onChange}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              className="pwd-toggle"
              aria-label={showPwd ? "Hide password" : "Show password"}
              onClick={() => setShowPwd((value) => !value)}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          <label className="label" htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            className="input select"
            value={form.role}
            onChange={onChange}
            required
          >
            <option value="FARMER">Farmer</option>
            <option value="VET">Vet</option>
            <option value="PARTNER">Partner Organization</option>
          </select>

          <label className="remember">
            <input type="checkbox" name="smsOptIn" checked={form.smsOptIn} onChange={onChange} />
            <span>Receive urgent SMS alerts</span>
          </label>

          <label className="remember">
            <input type="checkbox" name="whatsappOptIn" checked={form.whatsappOptIn} onChange={onChange} />
            <span>Receive WhatsApp alerts on the same number</span>
          </label>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Creating..." : "Create Account"}
            </button>
          </div>

          {msg ? <div className="help" role="status">{msg}</div> : null}
        </form>
      </div>
    </div>
  );
}
