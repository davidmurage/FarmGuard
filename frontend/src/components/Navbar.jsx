import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

export default function Navbar(){
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const LinkItem = ({to,label,onClick}) => (
    <Link className={`nav-link ${pathname===to?'active':''}`} to={to} onClick={onClick}>
      {label}
    </Link>
  );

  return (
    <header className="nav-root">
      <div className="container nav-wrap">
        <Link to="/" className="brand" onClick={()=>setOpen(false)}>
          <span className="brand-mark" />
          <span className="brand-text">FarmGuard</span>
        </Link>

        {/* Desktop links */}
        <nav className="nav-links desktop-only">
          <LinkItem to="/" label="Home" />
          <a className="nav-link" href="#about">About</a>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#contact">Contact</a>
        </nav>

        <div className="nav-cta desktop-only">
          <Link to="/login" className="btn btn-outline">Sign In</Link>
        </div>

        {/* Hamburger */}
        <button
          className={`hamburger mobile-only ${open ? "is-open" : ""}`}
          aria-label="Open navigation menu"
          aria-expanded={open}
          onClick={()=>setOpen(v=>!v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile sheet */}
      <div className={`mobile-sheet ${open ? "open" : ""}`} onClick={()=>setOpen(false)}>
        <nav className="mobile-card" onClick={(e)=>e.stopPropagation()}>
          <LinkItem to="/" label="Home" onClick={()=>setOpen(false)} />
          <a className="nav-link" href="#about" onClick={()=>setOpen(false)}>About</a>
          <a className="nav-link" href="#features" onClick={()=>setOpen(false)}>Features</a>
          <a className="nav-link" href="#contact" onClick={()=>setOpen(false)}>Contact</a>
          <Link to="/login" className="btn btn-outline mobile-signin" onClick={()=>setOpen(false)}>
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
