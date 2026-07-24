// src/components/system/NetworkMonitor.jsx
import { useEffect } from "react";

export default function NetworkMonitor({ onStatusChange }) {
  useEffect(() => {
    let lastStatus = navigator.onLine ? "online" : "offline";

    const updateStatus = (status) => {
      if (status !== lastStatus) {
        lastStatus = status;
        onStatusChange?.(status);
      }
    };

    const handleOffline = () => updateStatus("offline");
    const handleOnline = () => updateStatus("online");

    // initial state
    updateStatus(navigator.onLine ? "online" : "offline");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // periodic deep check (important fallback)
    const checkInternet = async () => {
      try {
        await fetch("https://www.google.com/favicon.ico", {
          mode: "no-cors",
          cache: "no-cache",
        });

        updateStatus("online");
      } catch {
        updateStatus("offline");
      }
    };

    const interval = setInterval(checkInternet, 15000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [onStatusChange]);

  return null;
}