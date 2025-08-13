import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Signup.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Signup(){
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"FARMER" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const on = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try{
      const { data } = await axios.post(`${API}/api/auth/register`, form);
      localStorage.setItem("fg_token", data.token);
      localStorage.setItem("fg_user", JSON.stringify(data.user));
      setMsg("Account created! You are logged in.");
    }catch(err){
      setMsg(err?.response?.data?.message || "Registration failed");
    }finally{
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
            onChange={on}
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
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
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

          <label className="label" htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            className="input select"
            value={form.role}
            onChange={on}
            required
          >
            <option value="FARMER">Farmer</option>
            <option value="VET">Vet</option>
            {/* Admin intentionally hidden */}
          </select>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Creating..." : "Sign Up"}
            </button>
          </div>

          {msg && <div className="help" role="status">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
