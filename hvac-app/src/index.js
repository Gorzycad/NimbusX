// ✅ src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext"; // ✅ updated folder (not contexts)
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ProtectedRoute from "./ProtectedRoute"; // ✅ corrected import path
import CompanyDashboard from "./CompanyDashboard";
import "./index.css";
import ForgotPassword from "./components/auth/ForgotPassword";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import TenderList from "./pages/tender/TenderList";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />

          {/* Protected Dashboard */}
          <Route
            path="/CompanyDashboard/*"
            element={
              <ProtectedRoute>
                <CompanyDashboard />
              </ProtectedRoute>
            }
          />


          {/* Catch-all: redirect all unknown routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);
