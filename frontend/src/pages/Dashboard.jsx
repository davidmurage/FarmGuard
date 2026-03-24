import { Navigate } from "react-router-dom";

import { getAuth } from "../lib/authStore";
import { roleHome } from "../utils/auth";

export default function Dashboard() {
  const auth = getAuth();

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleHome(auth.user.role)} replace />;
}
