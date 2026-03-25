import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import App from "./App.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LandingPage from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.jsx";
import FarmerDashboard from "./pages/dashboard/FarmerDashboard.jsx";
import PartnerDashboard from "./pages/dashboard/PartnerDashboard.jsx";
import VetDashboard from "./pages/dashboard/VetDashboard.jsx";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route
          path="dashboard/farmer"
          element={<ProtectedRoute roles={["FARMER"]}><FarmerDashboard /></ProtectedRoute>}
        />
        <Route
          path="dashboard/vet"
          element={<ProtectedRoute roles={["VET"]}><VetDashboard /></ProtectedRoute>}
        />
        <Route
          path="dashboard/admin"
          element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="dashboard/partner"
          element={<ProtectedRoute roles={["PARTNER"]}><PartnerDashboard /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>,
);
