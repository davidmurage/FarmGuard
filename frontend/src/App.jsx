import { Outlet } from "react-router-dom";

import Navbar from "./components/Navbar";

export default function App() {
  return (
    <>
      <Navbar />
      <Outlet />
      <footer className="container app-footer">
        &copy; {new Date().getFullYear()} FarmGuard - Safeguarding food systems with earlier action.
      </footer>
    </>
  );
}
