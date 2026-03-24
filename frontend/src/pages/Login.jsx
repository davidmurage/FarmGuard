import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { apiPost, extractApiErrorMessage } from "../lib/api";
import { getAuth, setAuth } from "../lib/authStore";
import { roleHome } from "../utils/auth";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const currentAuth = getAuth();
  const [form, setForm] = useState({
    email: localStorage.getItem("fg_email_hint") || "",
    password: "",
    remember: Boolean(localStorage.getItem("fg_email_hint")),
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  if (currentAuth.token && currentAuth.user) {
    return <Navigate to={roleHome(currentAuth.user.role)} replace />;
  }

  const onChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMsg("");

    try {
      const data = await apiPost("/api/auth/login", {
        email: form.email,
        password: form.password,
      });

      setAuth({ user: data.user, token: data.token });

      if (form.remember) {
        localStorage.setItem("fg_email_hint", form.email);
      } else {
        localStorage.removeItem("fg_email_hint");
      }

      navigate(roleHome(data.user.role), { replace: true });
    } catch (error) {
      setMsg(extractApiErrorMessage(error, "Login failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <header className="auth-header">
          <h1>Sign in</h1>
          <p className="switch-auth">
            Don't have an account?{" "}
            <Link to="/signup" className="link">Sign Up</Link>
          </p>
        </header>

        <form onSubmit={submit} className="form-card" noValidate>
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
              autoComplete="current-password"
              placeholder="Your password"
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

          <div className="row-between">
            <label className="remember">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={onChange}
              />
              <span>Remember me</span>
            </label>
            <button type="button" className="link link-inline">
              Forgot password?
            </button>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Signing in..." : "Log In"}
            </button>
          </div>

          {msg ? <div className="banner" role="status">{msg}</div> : null}
        </form>
      </div>
    </div>
  );
}
