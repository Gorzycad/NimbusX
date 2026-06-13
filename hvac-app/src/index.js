// ✅ src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";

import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";

import ProtectedRoute from "./ProtectedRoute";
import CompanyDashboard from "./CompanyDashboard";

import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />

          {/* ================= PROTECTED DASHBOARD ================= */}
          <Route
            path="/CompanyDashboard/*"
            element={
              <ProtectedRoute>
                <CompanyDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= DEFAULT REDIRECT ================= */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);
