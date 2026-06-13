// src/components/common/SubscriptionBanner.jsx

import { useAuth } from "../../contexts/AuthContext";
import { useEffect } from "react";

export default function SubscriptionBanner() {
  const { userData } = useAuth();

  // 🔔 Show alert ONLY once
  useEffect(() => {
    if (userData && userData.accessEnabled === false) {
      alert("Subscription required. Contact your admin or renew yourself.");
    }
  }, [userData]);

  if (!userData || userData.accessEnabled !== false) return null;

  return (
    <div
      style={{
        background: "#ffdddd",
        color: "red",
        padding: "12px",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 16,
      }}
    >
      🚨 Subscription required. Contact your admin or renew yourself.
    </div>
  );
}