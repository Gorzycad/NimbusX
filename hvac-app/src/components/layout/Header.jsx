// src/components/layout/Header.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Building2, Bell, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  const { user, displayName, companyId, authReady, userData } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  //const [logoSrc, setLogoSrc] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------------------------------
  // 🔔 NOTIFICATIONS BADGE LISTENER
  // -----------------------------------------------------
  const [unreadCount, setUnreadCount] = useState(0);

  const logoSrc = companyLogo?.fileId
  ? `https://lh3.googleusercontent.com/d/${companyLogo.fileId}=w1000`
  : null;
  
  // const logoSrc = companyLogo?.fileId
  // ? `https://drive.google.com/thumbnail?id=${companyLogo.fileId}&sz=w1000`
  // : null;
  
  // const logoSrc = companyLogo?.fileId
  // ? `https://drive.google.com/uc?export=view&id=${companyLogo.fileId}`
  // : null;

  useEffect(() => {
    console.log("companyLogo changed:", companyLogo);
    console.log("logoSrc:", logoSrc);
  }, [companyLogo]);

  useEffect(() => {
    if (!companyId) return;

    const ref = doc(db, "companies", companyId);

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      setCompanyName(data.companyName || data.name || "");

      setCompanyLogo(data.companyLogo || null);
      console.log("Company document:", data);
      console.log("Company logo:", data.companyLogo);
    });

    return () => unsubscribe();
  }, [companyId]);

  useEffect(() => {
    if (!user || !companyId) return;

    const notifRef = collection(db, "companies", companyId, "users", user.uid, "notifications");
    const q = query(notifRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((d) => d.data());
      const unread = notifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user, companyId]);

  // useEffect(() => {
  //   const loadLogo = async () => {
  //     setLogoSrc(null);

  //     if (!companyLogo?.fileId || !companyId) return;

  //     if (!window.electron?.getCompanyLogo) {
  //       console.warn("IPC not available");
  //       return;
  //     }

  //     try {
  //       //const result = window.electron.getCompanyLogo(companyLogo.fileId);
  //       const result = await window.electron.getCompanyLogo(companyLogo.fileId, companyId);

  //       if (result?.success && result.url) {
  //         //setLogoSrc(`${result.url}&t=${Date.now()}`);
  //         setLogoSrc(result.url);
  //       }
  //     } catch (err) {
  //       console.error("Failed to load logo:", err);
  //     }
  //   };

  //   loadLogo();
  // }, [companyLogo?.fileId, companyId]);

  //   useEffect(() => {
  //   const loadLogo = async () => {
  //     if (!companyLogo?.fileId || !companyId) return;
  //     if (!window.electron?.getCompanyLogo) return;

  //     try {
  //       setLogoSrc(null);

  //       const result = await window.electron.getCompanyLogo(
  //         companyLogo.fileId,
  //         companyId
  //       );

  //       console.log("LOGO RESULT:", result);

  //       if (result?.success && result.url) {
  //         setLogoSrc(result.url);
  //       }
  //     } catch (err) {
  //       console.error("Failed to load logo:", err);
  //     }
  //   };

  //   loadLogo();
  // }, [companyLogo?.fileId, companyId]);

  // useEffect(() => {
  //   if (!companyLogo?.fileId) return;

  //   const url = `https://drive.google.com/uc?export=view&id=${companyLogo.fileId}`;
  //   setLogoSrc(url);
  // }, [companyLogo?.fileId]);

  

  console.log("electron object:", window.electron);

  if (!authReady) {
    return (
      <header style={{ padding: 20 }}>
        Loading...
      </header>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);

    // small delay so spinner becomes visible
    setTimeout(() => {
      navigate(location.pathname, {
        replace: true,
        state: { refresh: Date.now() },
      });

      setRefreshing(false);
    }, 700);
  };

  console.log("logoSrc:", logoSrc);

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
        {/* <h2 style={{ margin: 0 }}>{companyName}</h2> */}
        <h2>{companyName || "Loading..."}</h2>

        {logoSrc ? (
          <img
            src={logoSrc}
            alt={`${companyName} Logo`}
            style={{
              height: 60,
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        ) : (
          <Building2 size={60} />
        )}

      </div>

      {/* LEFT SIDE — Welcome + Notifications */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        {/* Welcome Text */}
        <h4 style={{ margin: 0 }}>

          Welcome, {displayName || "Loading..."}
        </h4>
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

        {/* 🔄 Refresh Button */}
        <div
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Refresh Page"
          onClick={handleRefresh}
        >
          <RefreshCw
            size={22}
            color="orange"
            className={refreshing ? "spin-refresh" : ""}
          />
        </div>
      </div>

    </header>
  );
}
