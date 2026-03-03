// src/components/layout/Header.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Building2, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { user, displayName, companyId } = useAuth();
  const [companyDetails, setCompanyDetails] = useState({
    name: "",
    logourl: null,
    logosize: 60,
  });
  const navigate = useNavigate();

  // -----------------------------------------------------
  // 🔔 NOTIFICATIONS BADGE LISTENER
  // -----------------------------------------------------
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !companyId) return;

    const notifRef = collection(db,"companies",companyId,"users",user.uid,"notifications");
    const q = query(notifRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((d) => d.data());
      const unread = notifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user, companyId]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) return;

      try {
        const companyRef = doc(db, "companies", companyId);
        const companySnap = await getDoc(companyRef);

        if (companySnap.exists()) {
          const data = companySnap.data();
          const companyName = data.companyName || "Unnamed Company";
          const logoUrl = data.companyLogoUrl || null;

          setCompanyDetails({
            name: companyName,
            logourl: logoUrl,
            logosize: 60,
          });

          localStorage.setItem("companyName", companyName);
          localStorage.setItem("companyLogoUrl", logoUrl || "null");
        } else {
          console.warn("No company data found for ID:", companyId);
        }
      } catch (err) {
        console.error("Error fetching company data:", err);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  const companyName =
    companyDetails.name && companyDetails.name !== "Unnamed Company"
      ? companyDetails.name
      : "My Company";


  const companyLogo =
    companyDetails.logourl && companyDetails.logourl !== "null"
      ? companyDetails.logourl
      : Building2; // Fallback to Lucide icon

  return (
    <header
      className="app-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        height: 60,
        borderBottom: "1px solid #ddd",
        background: "#f8f9fa",
      }}
    >
      {/* LEFT SIDE — Company */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>{companyName}</h2>

        {typeof companyLogo === "string" ? (
          <img
            src={companyLogo}
            alt={`${companyName} Logo`}
            style={{
              width: "auto",
              height: companyDetails.logosize,
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        ) : (
          // Render Lucide icon fallback
          React.createElement(companyLogo, {
            size: companyDetails.logosize,
            color: "#000",
          })
        )}
      </div>

      {/* LEFT SIDE — Welcome + Notifications */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        {/* Welcome Text */}
        <h4 style={{ margin: 0 }}>Welcome, {displayName || "User"}</h4>

        {/* 🔔 Notifications Button */}
        <div
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => navigate("/CompanyDashboard")}
        >
          <Bell size={22} />

          {/* 🔴 Badge */}
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                background: "red",
                color: "white",
                borderRadius: "50%",
                padding: "3px 7px",
                fontSize: 11,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
      </div>

    </header>
  );
}
