//src/components/auth/SubscriptionGuard.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function SubscriptionGuard({ children }) {
  const { userData, isDeveloperFreeCompany } = useAuth();
  const location = useLocation();
  
  

  // Allow staff page always
  const isStaffPage = location.pathname.includes("/staff");

  
  

  // Exempt companies always have access
  if (isDeveloperFreeCompany) {
    return children;
  }

  // If access enabled → allow app
  if (userData?.accessEnabled !== false) {
    return children;
  }

  // Allow staff page even when blocked
  if (isStaffPage) {
    return children;
  }

  // BLOCK ENTIRE APP
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        background: "#fff",
        padding: 30,
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "#dc3545", marginBottom: 20 }}>
        Subscription Expired
      </h1>

      <p style={{ fontSize: 18, maxWidth: 600 }}>
        Please go to Staff Menu to renew subscription
        to continue using the software.
      </p>
    </div>
  );
}