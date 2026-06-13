import React, { useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SubscriptionBanner from "../common/SubscriptionBanner"; // 👈 ADD
import "./App.css";
import { useAuth } from "../../contexts/AuthContext";
import { runMonthlyReset } from "../../utils/billingReset";

export default function AppLayout({ children }) {
  const { userData } = useAuth();

  useEffect(() => {
    if (userData?.companyId) {
      runMonthlyReset(userData.companyId);
    }
  }, [userData]);

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Header />

        {/* 🔥 GLOBAL SUBSCRIPTION WARNING */}
        <SubscriptionBanner />

        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}