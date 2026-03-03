import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ROLE_ACCESS } from "./config/roleAccess"; // ✅ imported from your config file
import { useLocation } from "react-router-dom";

/**
 * ✅ Protects routes by checking both authentication and role-based authorization.
 * Usage example:
 *   <ProtectedRoute page="reports"><Reports /></ProtectedRoute>
 */
// export default function ProtectedRoute({ children, page }) {
//   const { user: currentUser, loading, role, userData } = useAuth(); // simplified to use role directly
//   const companyId = userData?.companyId;
//   const location = useLocation();

//   // ⏳ Still fetching user or Firestore data
//   if (loading || !userData) {
//     return <div style={{ padding: 20 }}>Loading user data...</div>;
//   }

//   // 🚫 Redirect unauthenticated users
//   if (!currentUser) return <Navigate to="/login" replace />;

//   // 🚫 Missing companyId (after ensuring userData is loaded)
//   if (!companyId)
//     return (
//       <p style={{ color: "red", padding: 20 }}>
//         ⚠️ No company ID found. Please log in again.
//       </p>
//     );

//   // ✅ Log identified user
//   if (currentUser) {
//     console.log("✅ This user is identified:", currentUser.email || currentUser.uid);
//   }

//   // ✅ Debugging logs
//   console.log("✅ Authenticated user:", currentUser.email || currentUser.uid);
//   console.log("✅ Role:", role);
//   console.log("✅ Company ID:", companyId);


//   // 🧾 Normalize role and page
//   //const normalizedRole = role?.toLowerCase();
//   const normalizedRole = (role || "")
//     .trim()
//     .toLowerCase()
//     .replace(/\s+/g, "_");
//   const pathSegments = location.pathname.split("/").filter(Boolean); // removes empty strings
//   const normalizedPage = pathSegments[pathSegments.length - 1].toLowerCase(); // last segment

//   //const normalizedPage = location.pathname
//   //.replace("/", "")       // remove leading slash
//   //.toLowerCase()          // lowercase for comparison
//   //.trim();                // remove spaces

//   // 🛑 Missing role data
//   if (!normalizedRole) {
//     console.warn("No role found for current user");
//     return <Navigate to="/unauthorized" replace />;
//   }

//   // 🧭 Check if role has permission to this page
//   // Allowed pages should also be lowercase
//   // Normalize role: lowercase + convert spaces to underscores

//   const allowedPages = ROLE_ACCESS[normalizedRole]?.map(p => p.toLowerCase()) || [];
//   const canAccess = allowedPages.includes(normalizedPage);

//   // 🪵 Debugging logs — add here
//   //console.log("Role:", normalizedRole);
//   console.log("Allowed pages:", allowedPages);
//   console.log("Current page:", normalizedPage);

//   if (!canAccess) {
//     return (
//       <div style={{ padding: 40, textAlign: "center" }}>
//         <h2>🚫 Access Denied</h2>
//         <p>
//           Your account role (<strong>{normalizedRole}</strong>) does not have permission to view{" "}
//           <strong>{page}</strong> page.
//         </p>
//         <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
//           If you believe this is an error, please contact your company administrator.
//         </p>
//       </div>
//     );
//   }

//   // ✅ Authorized → render page
//   return children;
// }

export default function ProtectedRoute({ children }) {
  const { user, authReady } = useAuth();

  // ⏳ Wait until Firebase auth initializes
  if (!authReady) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  // 🚫 Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in → allow rendering
  return children;
}
