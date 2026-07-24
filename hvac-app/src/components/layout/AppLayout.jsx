import React, { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SubscriptionBanner from "../common/SubscriptionBanner";
import NetworkMonitor from "../system/NetworkMonitor";
import "./App.css";
import { useAuth } from "../../contexts/AuthContext";
import { runMonthlyReset } from "../../utils/billingReset";

export default function AppLayout({ children }) {
  const { userData } = useAuth();

  const [connectionStatus, setConnectionStatus] = useState(null);

  // -----------------------------
  // BILLING RESET
  // -----------------------------
  useEffect(() => {
    if (userData?.companyId) {
      runMonthlyReset(userData.companyId);
    }
  }, [userData]);

  // -----------------------------
  // AUTO HIDE ONLINE MESSAGE
  // -----------------------------
  useEffect(() => {
    if (connectionStatus === "online") {
      const timer = setTimeout(() => {
        setConnectionStatus(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  return (
    <div className="app-layout">
      {/* 🔥 NETWORK MONITOR (LOGIC LAYER) */}
      <NetworkMonitor onStatusChange={setConnectionStatus} />

      <Sidebar />

      <div className="main-content">
        <Header />

        {/* 🔥 GLOBAL CONNECTION STATUS BANNER */}
        {connectionStatus === "offline" && (
          <div
            style={{
              background: "#dc3545",
              color: "white",
              padding: "10px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            ⚠️ Check your internet connection
          </div>
        )}

        {connectionStatus === "online" && (
          <div
            style={{
              background: "#28a745",
              color: "white",
              padding: "10px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            ✅ Internet connection restored
          </div>
        )}

        {/* 🔥 GLOBAL SUBSCRIPTION WARNING */}
        <SubscriptionBanner />

        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}