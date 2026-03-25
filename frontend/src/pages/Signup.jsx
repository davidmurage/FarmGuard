import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { apiPost, extractApiErrorMessage } from "../lib/api";
import { getAuth, setAuth } from "../lib/authStore";
import { roleHome } from "../utils/auth";
import "../styles/Signup.css";

export default function Signup() {
  const navigate = useNavigate();
  const currentAuth = getAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "FARMER" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  if (currentAuth.token && currentAuth.user) {
    return <Navigate to={roleHome(currentAuth.user.role)} replace />;
  }

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMsg("");

    try {
      const data = await apiPost("/api/auth/register", form);
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
