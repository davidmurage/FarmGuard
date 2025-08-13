import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login(){
  const [form, setForm] = useState({ email:"", password:"", remember:false });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const on = (e) => {
    const { name, type, checked, value } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try{
      const { data } = await axios.post(`${API}/api/auth/login`, {
        email: form.email,
        password: form.password
      });
      localStorage.setItem("fg_token", data.token);
      localStorage.setItem("fg_user", JSON.stringify(data.user));
      // Optionally persist email if remember is checked
      if (form.remember) localStorage.setItem("fg_email_hint", form.email);
      setMsg(`Welcome back, ${data.user.name}! Role: ${data.user.role}`);
    }catch(err){
      setMsg(err?.response?.data?.message || "Login failed");
    }finally{
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <header className="auth-header">
          <h1>Sign in</h1>
          <p className="switch-auth">
            Don’t have an account?{" "}
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
            onChange={on}
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
              onChange={on}
              required
              autoComplete="current-password"
              placeholder="Your password"
            />
            <button
              type="button"
              className="pwd-toggle"
              aria-label={showPwd ? "Hide password" : "Show password"}
              onClick={() => setShowPwd(v => !v)}
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
                onChange={on}
              />
              <span>Remember me</span>
            </label>
            <button type="button" className="link link-inline">
              Forgot password?
            </button>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Signing in..." : "Login"}
            </button>
          </div>

          {msg && <div className="banner" role="status">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
