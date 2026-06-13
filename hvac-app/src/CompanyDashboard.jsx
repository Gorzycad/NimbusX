// src/CompanyDashboard.jsx
import React, { useState, createContext, useContext, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import SubscriptionGuard from "./components/auth/SubscriptionGuard";
import DashboardHome from "./pages/dashboard/DashboardHome";
import { useEffect } from "react";
import { initializeAppSettings } from "./firebase/appSettingsService";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase/firebase";

// helpers
import { getAllowedPages } from "./helpers/getAllowedPages";

// modules (consider lazy loading later for performance)
import LeadsList from "./pages/leads/LeadsList";
import DesignProjects from "./pages/design/DesignProjects";
import BOQList from "./pages/boq/BOQList";
import TenderList from "./pages/tender/TenderList";
import AwardList from "./pages/award/AwardList";
import MTOList from "./pages/mto/MTOList";
import POList from "./pages/po/POList";
import ExecutionOverview from "./pages/execution/ExecutionOverview";
import ProgressReports from "./pages/reports/ProgressReports";
import HandoverList from "./pages/handover/HandoverList";
import Staff from "./pages/staff/Staff";
import Support from "./pages/support/Support";
import Inventory from "./pages/inventory/Inventory";
import Logistics from "./pages/logistics/Logistics";
import Marketplace from "./pages/marketplace/Marketplace";
import Procurement from "./pages/procurement/Procurement";
import Finance from "./pages/finance/Finance";
import Maintenance from "./pages/maintenance/Maintenance";
import NimbusX from "./pages/nimbusx/NimbusX";
import NetworkMonitor from "./components/system/NetworkMonitor";

// Context
const CompanyContext = createContext();
export const useCompany = () => useContext(CompanyContext);

export default function CompanyDashboard() {
  const { role, userData, user } = useAuth();

  useEffect(() => {
    initializeAppSettings();
  }, []);

  const normalizedRole = useMemo(
    () => (role || "").toLowerCase(),
    [role]
  );

  // 🔥 IMPORTANT: memoized permissions (prevents rerender loops)
  const allowedPages = useMemo(() => {
    return getAllowedPages(
      normalizedRole,
      userData?.customPermissions
    );
  }, [normalizedRole, userData?.customPermissions]);

  const isSuperUser = useMemo(() => {
    return ["ceo", "director", "company_admin"].includes(normalizedRole);
  }, [normalizedRole]);

  const companyId = userData?.companyId || null;

  const contextValue = useMemo(
    () => ({
      companyId,
    }),
    [companyId]
  );

  useEffect(() => {

    if (!user || !companyId) return;

    if (!["company_admin", "developer"].includes(role)) return;

    const today = new Date();

    const day = today.getDate().toString();

    const monthId =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const attendanceKey =
      `attendance-${companyId}-${user.uid}-${monthId}-${day}`;

    // already marked today
    if (localStorage.getItem(attendanceKey)) return;

    const markAttendance = async () => {

      try {

        const attRef = doc(
          db,
          "companies",
          companyId,
          "attendance",
          monthId,
          "staff",
          user.uid
        );

        await setDoc(
          attRef,
          {
            [day]: true,
          },
          { merge: true }
        );

        localStorage.setItem(attendanceKey, "true");

      } catch (e) {

        console.warn("⚠️ Attendance write failed:", e.message);

      }
    };

    markAttendance();

  }, [user, companyId, role]);

  return (
    <CompanyContext.Provider value={contextValue}>
      <NetworkMonitor />
      <AppLayout>
        <SubscriptionGuard>
          <Routes>

            {/* ================= DASHBOARD HOME ================= */}
            <Route path="/" element={<DashboardHome />} />

            {/* ================= MODULE ROUTES ================= */}
            {(isSuperUser || allowedPages.includes("leads")) && (
              <Route path="leads" element={<LeadsList />} />
            )}

            {(isSuperUser || allowedPages.includes("design")) && (
              <Route path="design" element={<DesignProjects />} />
            )}

            {(isSuperUser || allowedPages.includes("boq")) && (
              <Route path="boq" element={<BOQList />} />
            )}

            {(isSuperUser || allowedPages.includes("tender")) && (
              <Route path="tender" element={<TenderList />} />
            )}

            {(isSuperUser || allowedPages.includes("award")) && (
              <Route path="award" element={<AwardList />} />
            )}

            {(isSuperUser || allowedPages.includes("mto")) && (
              <Route path="mto" element={<MTOList />} />
            )}

            {(isSuperUser || allowedPages.includes("po")) && (
              <Route path="po" element={<POList />} />
            )}

            {(isSuperUser || allowedPages.includes("execution")) && (
              <Route path="execution" element={<ExecutionOverview />} />
            )}

            {(isSuperUser || allowedPages.includes("reports")) && (
              <Route path="reports" element={<ProgressReports />} />
            )}

            {(isSuperUser || allowedPages.includes("handover")) && (
              <Route path="handover" element={<HandoverList />} />
            )}

            {(isSuperUser || allowedPages.includes("staff")) && (
              <Route path="staff" element={<Staff />} />
            )}

            {(isSuperUser || allowedPages.includes("support_tickets")) && (
              <Route path="support_tickets" element={<Support />} />
            )}

            {(isSuperUser || allowedPages.includes("procurement")) && (
              <Route path="procurement" element={<Procurement />} />
            )}

            {(isSuperUser || allowedPages.includes("finance")) && (
              <Route path="finance" element={<Finance />} />
            )}

            {(isSuperUser || allowedPages.includes("maintenance")) && (
              <Route path="maintenance" element={<Maintenance />} />
            )}

            {(isSuperUser || allowedPages.includes("logistics")) && (
              <Route path="logistics" element={<Logistics />} />
            )}

            {(isSuperUser || allowedPages.includes("marketplace")) && (
              <Route path="marketplace" element={<Marketplace />} />
            )}

            {(isSuperUser || allowedPages.includes("inventory")) && (
              <Route path="inventory" element={<Inventory />} />
            )}

            {(isSuperUser || allowedPages.includes("nimbusx")) && (
              <Route path="nimbusx" element={<NimbusX />} />
            )}

            {/* ================= FALLBACK ================= */}
            <Route
              path="*"
              element={<Navigate to="/CompanyDashboard" replace />}
            />

          </Routes>
        </SubscriptionGuard>
      </AppLayout>
    </CompanyContext.Provider>
  );
}
