// src/components/system/NetworkMonitor.jsx
import { useEffect } from "react";

export default function NetworkMonitor() {

  useEffect(() => {

    let isOffline = false;

    const showOffline = () => {
      if (!isOffline) {
        isOffline = true;
        alert("Check your internet connection");
      }
    };

    const showOnline = () => {
      if (isOffline) {
        isOffline = false;
        alert("Internet connection restored");
      }
    };

    // Browser offline detection
    window.addEventListener("offline", showOffline);

    // Browser online detection
    window.addEventListener("online", showOnline);

    // Active internet check
    const checkInternet = async () => {

      try {

        await fetch("https://www.google.com/favicon.ico", {
          mode: "no-cors",
          cache: "no-cache",
        });

        showOnline();

      } catch (err) {

        showOffline();
      }
    };

    // Check every 15 seconds
    const interval = setInterval(checkInternet, 15000);

    return () => {
      clearInterval(interval);

      window.removeEventListener("offline", showOffline);
      window.removeEventListener("online", showOnline);
    };

  }, []);

  return null;
}