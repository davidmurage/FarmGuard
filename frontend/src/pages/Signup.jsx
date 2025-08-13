import React, { useState } from "react";
import axios from "axios";
import "../styles/Signup.css"; // Ensure global styles are imported

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Signup(){
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"FARMER" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const on = e => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try{
      const { data } = await axios.post(`${API}/api/auth/register`, form);
      localStorage.setItem("fg_token", data.token);
      localStorage.setItem("fg_user", JSON.stringify(data.user));
      setMsg("Account created! You are logged in.");
    }catch(err){
      setMsg(err?.response?.data?.message || "Registration failed");
    }finally{ setBusy(false); }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <h1>Create your account</h1>
        <form onSubmit={submit} className="form-card">
          <label className="label">Full name</label>
          <input className="input" name="name" value={form.name} onChange={on} required />

          <label className="label">Email</label>
          <input className="input" name="email" type="email" value={form.email} onChange={on} required />

          <label className="label">Password</label>
          <input className="input" name="password" type="password" value={form.password} onChange={on} required />

          <label className="label">Role</label>
          <div className="roles">
            {["FARMER","VET","ADMIN"].map(r => (
              <label key={r} className={`role-chip ${form.role===r?'active':''}`}>
                <input type="radio" name="role" value={r} checked={form.role===r} onChange={on}/>
                {r}
              </label>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>{busy?"Creating...":"Sign Up"}</button>
          </div>
          {msg && <div className="help">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
