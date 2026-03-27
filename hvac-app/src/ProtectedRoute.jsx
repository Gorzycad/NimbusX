import { Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, authReady } = useAuth();

   console.log("🔍 ProtectedRoute check:", { authReady, user});

  // ⏳ Wait until Firebase auth initializes
  if (!authReady) {
    console.log("⏳ Auth not ready yet...");
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  // 🚫 Not logged in
  if (!user) {
    console.log("🚫 No user detected. Redirecting to login.");
    //return null; //or loading spinner
    return <Navigate to="/login" replace />;
  }

  console.log("✅ User authenticated. Rendering protected page.");

  // ✅ Logged in → allow rendering
  return children;
}