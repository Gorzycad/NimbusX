// src/CompanyDashboard.jsx
import { doc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SubscriptionGuard from "./components/auth/SubscriptionGuard";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./contexts/AuthContext";
import { initializeAppSettings } from "./firebase/appSettingsService";
import { auth, db } from "./firebase/firebase";
import DashboardHome from "./pages/dashboard/DashboardHome";

// helpers
import { getAllowedPages } from "./helpers/getAllowedPages";

// modules (consider lazy loading later for performance)
import NetworkMonitor from "./components/system/NetworkMonitor";
import AwardList from "./pages/award/AwardList";
import BOQList from "./pages/boq/BOQList";
import DesignProjects from "./pages/design/DesignProjects";
import ExecutionOverview from "./pages/execution/ExecutionOverview";
import Finance from "./pages/finance/Finance";
import HandoverList from "./pages/handover/HandoverList";
import Inventory from "./pages/inventory/Inventory";
import LeadsList from "./pages/leads/LeadsList";
import Logistics from "./pages/logistics/Logistics";
import Maintenance from "./pages/maintenance/Maintenance";
import Marketplace from "./pages/marketplace/Marketplace";
import MTOList from "./pages/mto/MTOList";
import NimbusX from "./pages/nimbusx/NimbusX";
import POList from "./pages/po/POList";
import Procurement from "./pages/procurement/Procurement";
import ProgressReports from "./pages/reports/ProgressReports";
import Staff from "./pages/staff/Staff";
import Support from "./pages/support/Support";
import TenderList from "./pages/tender/TenderList";

// Context
const CompanyContext = createContext();
export const useCompany = () => useContext(CompanyContext);

export default function CompanyDashboard() {
  const { role, userData, user } = useAuth();
  const location = useLocation();

  

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

    if (
      !user ||
      !companyId ||
      userData?.approved !== true
    ) {
      return;
    }

    //if (!["company_admin", "developer"].includes(role)) return;

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

  }, [user, companyId, role, userData?.approved]);

  if (
    userData &&
    userData.approved === false
  ) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="card p-4 text-center">
          <h3>Registration Pending Approval</h3>

          <p>
            Please inform your Company Administrator
            to approve your registration before using
            NimbusX.
          </p>

          <p>
            Your account has been created successfully
            but is awaiting approval.
          </p>
        </div>
        <button
          onClick={() => auth.signOut()}
          className="btn btn-secondary"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <CompanyContext.Provider value={contextValue}>
      <NetworkMonitor />
      <AppLayout>
        <SubscriptionGuard>
          <Routes key={`${location.pathname}-${location.state?.refresh ?? 0}`}>

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
