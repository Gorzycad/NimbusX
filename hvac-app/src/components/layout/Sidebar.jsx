// ✅ src/components/layout/Sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ROLE_ACCESS } from "../../config/roleAccess";

import {
  Home,
  UserPlus,
  Ruler,
  FileSpreadsheet,
  FileText,
  Award,
  Wrench,
  Truck,
  BarChart3,
  ClipboardCheck,
  LogOut,
  UserCircle,
  Users,
  Warehouse, //use for inventory
  List, //use for indent inventory
  Cog,
  ShoppingCart, // use for marketplace
  Headset, //use for support
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  BookUser, //use for marketing
  Boxes,  //use for estimation
  BaggageClaim, //use for orders
  Blocks, //use for execution
  NotebookText, //use for handover
  ChartLine, //use for reports
  ChartNoAxesCombined, //use for commercial
  UsersRound, //use for HR
  File, //use for Handover

} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const normalizedRole = (role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  // 🔽 Collapsible states for each section
  const [open, setOpen] = useState({
    general: true,
    sales: true,
    estimation: true,
    procurement: true,
    execution: true,
    handover: true,
    quality: true,
    inventory: true,
    finance: true,
    reports: true,
    admin: true,
    support: true,
    marketplace: true,
    nimbusx: true,
  });

  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // All pages grouped into sections
  const sections = [
    {
      key: "general",
      title: "General",
      icon: <LayoutDashboard size={18} />,  // ✅ New icon
      pages: [
        { key: "dashboard", label: "Dashboard", path: "/CompanyDashboard", icon: <Home size={18} /> },
      ],
    },
    {
      key: "sales",
      title: "Marketing",
      icon: <BookUser size={18} />,  // ✅ New icon

      pages: [
        { key: "leads", label: "Leads", path: "/CompanyDashboard/leads", icon: <UserPlus size={18} /> },
        { key: "tender", label: "Tender", path: "/CompanyDashboard/tender", icon: <FileText size={18} /> },
        { key: "award", label: "Award", path: "/CompanyDashboard/award", icon: <Award size={18} /> },
      ],
    },
    {
      key: "estimation",
      title: "Estimation",
      icon: <Boxes size={18} />,  // ✅ New icon

      pages: [
        { key: "design", label: "Design", path: "/CompanyDashboard/design", icon: <Ruler size={18} /> },
        { key: "boq", label: "BOQ", path: "/CompanyDashboard/boq", icon: <FileSpreadsheet size={18} /> },
        { key: "mto", label: "Takeoffs", path: "/CompanyDashboard/mto", icon: <Wrench size={18} /> },
      ],
    },
    {
      key: "procurement",
      title: "Orders",
      icon: <BaggageClaim size={18} />,  // ✅ New icon

      pages: [
        { key: "po", label: "Orders", path: "/CompanyDashboard/po", icon: <Truck size={18} /> },
      ],
    },
    {
      key: "execution",
      title: "Execution",
      icon: <Blocks size={18} />,  // ✅ New icon

      pages: [
        { key: "execution", label: "Execution", path: "/CompanyDashboard/execution", icon: <ClipboardCheck size={18} /> },
        { key: "logistics", label: "Logistics", path: "/CompanyDashboard/logistics", icon: <Truck size={18} /> },
      ],
    },
    {
      key: "handover",
      title: "Handover",
      icon: <NotebookText size={18} />,  // ✅ New icon

      pages: [
        { key: "handover", label: "Handover", path: "/CompanyDashboard/handover", icon: <File size={18} /> },
        { key: "maintenance", label: "Maintenance", path: "/CompanyDashboard/maintenance", icon: <Cog size={18} /> },
      ],
    },
    {
      key: "quality",
      title: "Reports",
      icon: <ChartLine size={18} />,  // ✅ New icon

      pages: [
        { key: "reports", label: "QA/QC Reports", path: "/CompanyDashboard/reports", icon: <BarChart3 size={18} /> },
      ],
    },
    {
      key: "inventory",
      title: "Inventory",
      icon: <Warehouse size={18} />,  // ✅ New icon

      pages: [
        { key: "inventory", label: "Inventory", path: "/CompanyDashboard/inventory", icon: <List size={18} /> },
      ],
    },
    {
      key: "finance",
      title: "Commercial",
      icon: <ChartNoAxesCombined size={18} />,  // ✅ New icon

      pages: [
        { key: "finance", label: "Finance", path: "/CompanyDashboard/finance", icon: <ClipboardCheck size={18} /> },
        { key: "procurement", label: "Procurement", path: "/CompanyDashboard/procurement", icon: <Truck size={18} /> },
      ],
    },
    {
      key: "admin",
      title: "HR",
      icon: <UsersRound size={18} />,  // ✅ New icon

      pages: [
        { key: "staff", label: "Staff", path: "/CompanyDashboard/staff", icon: <Users size={18} /> },
      ],
    },
    {
      key: "support",
      title: "Support",
      icon: <Headset size={18} />,  // ✅ New icon

      pages: [
        { key: "support_tickets", label: "Support", path: "/CompanyDashboard/support_tickets", icon: <Headset size={18} /> },
      ],
    },
    {
      key: "marketplace",
      title: "Marketplace",
      icon: <ShoppingCart size={18} />,  // ✅ New icon

      pages: [
        { key: "marketplace", label: "Marketplace", path: "/CompanyDashboard/marketplace", icon: <ShoppingCart size={18} /> },
      ],
    },
    {
      key: "nimbusx",
      title: "Developer",
      icon: <ChartLine size={18} />,  // ✅ New icon

      pages: [
        { key: "nimbusx", label: "DevPage", path: "/CompanyDashboard/nimbusx", icon: <ChartLine size={18} /> },
      ],
    },
  ];

  // Determine allowed pages for role
  const allPagesFlat = sections.flatMap((s) => s.pages);
  const allowedPages = ROLE_ACCESS[normalizedRole]?.map(p => p.toLowerCase()) || [];
  const isSuperUser = ["ceo", "director"].includes(normalizedRole);
  const isDeveloper = ["developer"].includes(normalizedRole);

  // Role-based filtering
  const filteredSections = sections.map((section) => ({
    ...section,
    pages: isDeveloper
      ? section.pages
      : section.pages.filter((p) => allowedPages.includes(p.key.toLowerCase())),
  })).filter((section) => section.pages.length > 0);

  // ✅ Handle logout action
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside
      style={{
        width: 260,
        background: "#f8f9fa",
        borderRight: "1px solid #ddd",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
      }}
    >
      {/* User Info */}
      {user && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "#e9ecef",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <UserCircle size={32} color="#007bff" />
          <div>
            <strong>{user.displayName || "User"}</strong>
            <p style={{ fontSize: 12, color: "#444", margin: 0 }}>
              {role
                ?.split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
              }
            </p>
          </div>
        </div>
      )}

      {/* Sections */}
      <nav style={{ overflowY: "auto", flexGrow: 1 }}>
        {filteredSections.map((section) => (
          <div key={section.key} style={{ marginBottom: 12 }}>
            {/* SECTION HEADER */}
            <div
              onClick={() => toggle(section.key)}
              style={{
                //display: "flex",
                //justifyContent: "space-between",
                // alignItems: "center",
                //fontWeight: "bold",
                cursor: "pointer",
                padding: "2px 4px",
                //color: "#444",

                display: "flex",
                alignItems: "center",
                gap: 8,
                //padding: "8px 12px",
                fontSize: 15,
                fontWeight: "bold",
                color: "#555",
                //textTransform: "uppercase",

              }}
            >
              {section.icon}   {/* ✅ Render the icon */}
              {section.title}
              {open[section.key] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>

            {/* SECTION PAGES */}
            {open[section.key] && (
              <div style={{ marginLeft: 16, marginTop: 6, display: "grid", gap: 6 }}>
                {section.pages.map((page) => (
                  <NavLink
                    key={page.key}
                    to={page.path}
                    className={({ isActive }) => (isActive ? "active" : "")}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 6,
                      textDecoration: "none",
                      background: isActive ? "#007bff" : "transparent",
                      color: isActive ? "#fff" : "#333",
                      fontSize: 14,
                    })}
                    end={page.key === "dashboard"}
                  >
                    {page.icon}
                    {page.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout Section */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 10,
          borderTop: "1px solid #ddd",
          display: "block",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            //rowGapap: "50px",
            columnGap: "10px",
            borderRadius: 6,
            color: "#333",
            background: "transparent",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
          }}
        >
          <LogOut size={18} /> Logout
        </button>

        {/* Logo/Header on the right */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",     // ensures NimbusX sits directly under the logout icon
            justifyContent: "center",
            marginTop: "4px",         // slight gap before NimbusX starts
          }}
        >
          <p
            style={{
              fontWeight: "bold",
              fontStyle: "italic",
              fontSize: "14px",
              marginTop: "2px",       // small extra spacing if needed
              marginBottom: 0,
              textAlign: "center",

            }}
          >
            NimbusX v1.0.2
          </p>
        </div>



      </div>

    </aside>
  );
}