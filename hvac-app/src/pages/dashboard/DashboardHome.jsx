import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Notifications from "./Notifications";

import DirectMessages from "../chat/DirectMessages";
import AdminAnnouncements from "../chat/AdminAnnouncements";
import ProjectChat from "../chat/ProjectChat";

export default function DashboardHome() {
  const { user, userData, displayName, companyId, role } = useAuth();

  const [activePanel, setActivePanel] = useState("notifications");

  const renderPanel = () => {
    switch (activePanel) {
      case "direct":
        return <DirectMessages />;
      case "admin":
        return <AdminAnnouncements />;
      case "project":
        return <ProjectChat />;
      default:
        return <Notifications />;
    }
  };

  // ✅ Extract company and role from live profile
  const companyIds = userData?.companyId || "N/A";

  return (
    <div style={{ padding: 30 }}>
      <p><strong>User:</strong> {displayName || user.email}</p>
      <p><strong>Company ID:</strong> {companyIds}</p>
      <p><strong>Role:</strong>{" "}
        {role
          ?.split(" ")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")}
      </p>

      <hr style={{ margin: "20px 5px" }} />

      <p>Welcome to your company dashboard! 🎉</p>
      <p>Use the left menu to access your modules.</p>

      {/* 🔔 SHARED COMMUNICATION CONTAINER */}
      <div style={{ marginTop: 30 }}>
        {/* BUTTON BAR */}
        <div style={{ display: "flex", gap: 12, marginBottom: 15 }}>
          <button onClick={() => setActivePanel("notifications")}>
            Notifications
          </button>

          <button onClick={() => setActivePanel("direct")}>
            Direct Messages
          </button>

          <button onClick={() => setActivePanel("admin")}>
            Admin Announcements
          </button>

          <button onClick={() => setActivePanel("project")}>
            Project Chat
          </button>
        </div>

        {/* CONTENT AREA */}
        <div style={{ border: "1px solid #ddd", padding: 15 }}>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
