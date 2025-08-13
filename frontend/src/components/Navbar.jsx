import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

export default function Navbar(){
  const { pathname } = useLocation();

  const LinkItem = ({to,label}) => (
    <Link className={`nav-link ${pathname===to?'active':''}`} to={to}>{label}</Link>
  );

  return (
    <header className="nav-root">
      <div className="container nav-wrap">
        <Link to="/" className="brand">
          <span className="brand-mark" />
          <span className="brand-text">FarmGuard</span>
        </Link>

        <nav className="nav-links hidden-sm">
          <LinkItem to="/" label="Home" />
          <a className="nav-link" href="#about">About</a>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#contact">Contact</a>
        </nav>

        <div className="nav-cta">
          <Link to="/login" className="btn btn-outline">Sign In</Link>
        </div>
      </div>
    </header>
  );
}
