import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import brandMark from "../assets/farm guard icon.jpg";
import { getAuth, logout, subscribe } from "../lib/authStore";
import { roleHome } from "../utils/auth";
import "../styles/Navbar.css";

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(getAuth());

  useEffect(() => subscribe(setAuth), []);

  const isAuthed = Boolean(auth.token && auth.user);
  const dashboardPath = isAuthed ? roleHome(auth.user.role) : "/login";

  const closeMenu = () => setOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  const LinkItem = ({ to, label, onClick }) => (
    <Link className={`nav-link ${pathname === to ? "active" : ""}`} to={to} onClick={onClick}>
      {label}
    </Link>
  );

  return (
    <header className="nav-root">
      <div className="container nav-wrap">
        <Link to="/" className="brand" onClick={closeMenu}>
          <img src={brandMark} alt="FarmGuard logo" className="brand-mark" />
          <span className="brand-text">FarmGuard</span>
        </Link>

        <nav className="nav-links desktop-only">
          <LinkItem to="/" label="Home" />
          {!isAuthed && pathname === "/" ? <a className="nav-link" href="#about">About</a> : null}
          {!isAuthed && pathname === "/" ? <a className="nav-link" href="#features">Features</a> : null}
          {isAuthed ? <LinkItem to={dashboardPath} label="Dashboard" /> : null}
        </nav>

        <div className="nav-cta desktop-only">
          {isAuthed ? (
            <>
              <span className="nav-role">{auth.user.role}</span>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <a className="nav-link nav-contact-link" href={pathname === "/" ? "#contact" : "/#contact"}>Contact</a>
              <Link to="/login" className="btn btn-outline">Sign In</Link>
            </>
          )}
        </div>

        <button
          className={`hamburger mobile-only ${open ? "is-open" : ""}`}
          aria-label="Open navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-sheet ${open ? "open" : ""}`} onClick={closeMenu}>
        <nav className="mobile-card" onClick={(event) => event.stopPropagation()}>
          <LinkItem to="/" label="Home" onClick={closeMenu} />
          {!isAuthed && pathname === "/" ? <a className="nav-link" href="#about" onClick={closeMenu}>About</a> : null}
          {!isAuthed && pathname === "/" ? <a className="nav-link" href="#features" onClick={closeMenu}>Features</a> : null}
          {isAuthed ? <LinkItem to={dashboardPath} label="Dashboard" onClick={closeMenu} /> : null}
          {!isAuthed ? (
            <Link to="/login" className="btn btn-outline mobile-signin" onClick={closeMenu}>
              Sign In
            </Link>
          ) : (
            <button type="button" className="btn btn-outline mobile-signin" onClick={handleLogout}>
              Sign Out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
