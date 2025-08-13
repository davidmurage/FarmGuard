import React, { useState } from "react";
import axios from "axios";
import "../styles/Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login(){
  const [form, setForm] = useState({ email:"", password:"" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const on = e => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try{
      const { data } = await axios.post(`${API}/api/auth/login`, form);
      localStorage.setItem("fg_token", data.token);
      localStorage.setItem("fg_user", JSON.stringify(data.user));
      setMsg(`Welcome back, ${data.user.name}! Role: ${data.user.role}`);
    }catch(err){
      setMsg(err?.response?.data?.message || "Login failed");
    }finally{ setBusy(false); }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <h1>Sign in</h1>
        <form onSubmit={submit} className="form-card">
          <label className="label">Email</label>
          <input className="input" name="email" type="email" value={form.email} onChange={on} required />

          <label className="label">Password</label>
          <input className="input" name="password" type="password" value={form.password} onChange={on} required />

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>{busy?"Signing in...":"Login"}</button>
          </div>
          {msg && <div className="help">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
