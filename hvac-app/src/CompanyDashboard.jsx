// src/CompanyDashboard.jsx
import React, { useState, createContext, useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import { ROLE_ACCESS } from "./config/roleAccess";
import DashboardHome from "./pages/dashboard/DashboardHome";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/leads/LeadsFileUpload";

// Modules
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

// Context
const CompanyContext = createContext();
export const useCompany = () => useContext(CompanyContext);

export default function CompanyDashboard() {
  const { user, role, userData } = useAuth();
  const [savedDetails, setSavedDetails] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const companyId = userData?.companyId || null;
  const normalizedRole = role?.toLowerCase();

  const handleProjectSave = (details) => setSavedDetails(details);
  const addNotification = (msg) =>
    setNotifications((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()} - ${msg}`,
    ]);

  const allowedPages = ROLE_ACCESS[normalizedRole] || [];
  const isSuperUser = ["ceo", "director", "company_admin"].includes(normalizedRole);

  return (
    <CompanyContext.Provider
      value={{ companyId, savedDetails, handleProjectSave, addNotification }}
    >
      <AppLayout>
        <Routes>
          {/* Default dashboard home */}
          <Route path="/" element={<DashboardHome />} />
          {/* Named route for dashboard */}
          <Route path="companydashboard" element={<DashboardHome />} />

          {/* Conditional module routes */}
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
          {(!isSuperUser || allowedPages.includes("nimbusx")) && (
            <Route path="nimbusx" element={<NimbusX />} />
          )}

          {/* Global logout */}
          <Route path="logout" element={<Navigate to="/login" replace />} />
          {/* Login page for signin to upload files */}
          <Route path="/login" element={<LoginPage />} />

          {/* Upload page */}
          <Route path="/upload" element={<UploadPage />} />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <div style={{ padding: 40, textAlign: "center" }}>
                <h2>🚫 Page Not Found</h2>
                <p style={{ color: "#777" }}>
                  The page doesn’t exist or you don’t have permission to view it.
                </p>
              </div>
            }
          />
        </Routes>
      </AppLayout>
    </CompanyContext.Provider>
  );
}
