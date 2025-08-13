import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
//import Navbar from "./components/Navbar/Navbar.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Outlet />
      <footer className="container" style={{padding:"28px 20px 40px", color:"var(--fg-muted)"}}>
        © {new Date().getFullYear()} FarmGuard — Safeguarding food systems
      </footer>
    </>
  );
}
