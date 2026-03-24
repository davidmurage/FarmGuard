import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getAuth, subscribe } from "../lib/authStore";
import { roleHome } from "../utils/auth";

export default function ProtectedRoute({ children, roles = [] }) {
  const location = useLocation();
  const [auth, setAuth] = useState(getAuth());

  useEffect(() => subscribe(setAuth), []);

  if (!auth.token || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles.length && !roles.includes(auth.user.role)) {
    return <Navigate to={roleHome(auth.user.role)} replace />;
  }

  return children;
}
