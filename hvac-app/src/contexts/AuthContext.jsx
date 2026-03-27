// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  //const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState("guest");
  const [displayName, setDisplayName] = useState("");
  const [companyId, setCompanyId] = useState(null);
  //const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // useEffect(() => {
  //   const storedLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  //   setIsLoggedIn(storedLoggedIn);
  // }, []);

  useEffect(() => {
    // Listen for OAuth success from Electron
    if (window.electron?.onOAuthSuccess) {
      window.electron.onOAuthSuccess(() => {
        console.log("✅ OAuth success received from Electron");

        //setIsLoggedIn(true);
        //localStorage.setItem("isLoggedIn", "true");

        // optional: redirect user to dashboard
        window.location.href = "/CompanyDashboard/leads";
      });
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      //setLoading(true);

      console.log("🔥 Firebase auth state changed:", firebaseUser);
      setAuthReady(false);

      if (!firebaseUser) {
        // No user logged in, skip Firestore reads
        setCurrentUser(null);
        setUserData(null);
        setRole("guest");
        setCompanyId(null);
        setDisplayName("");
        //setLoading(false);
        setAuthReady(true);
        return;
      }

      setCurrentUser(firebaseUser);

      try {
        // Force refresh to include latest custom claims
        await firebaseUser.getIdToken(true);
        // 🔥 READ CUSTOM CLAIMS HERE
        const tokenResult = await firebaseUser.getIdTokenResult();
        console.log("🔥 Custom claims:", tokenResult.claims);
        const uid = firebaseUser.uid;

        // Fetch user data from top-level /users collection
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.error("❌ User document not found:", uid);
          setCurrentUser(null);
          setUserData(null);
          setRole("guest");
          setCompanyId(null);
          setDisplayName("");

          // ⛑️ Fallback to claims if Firestore is missing
          //setRole(tokenResult.claims.role || "guest");
          const claimRole = normalizeRole(tokenResult.claims.role);
          setRole(claimRole || "guest");
          setCompanyId(tokenResult.claims.companyId || null);
          setDisplayName(firebaseUser.email || "");

          //setLoading(false);
          setAuthReady(true);
          return;
        }

        const data = userSnap.data();

        setUserData(data);
        //setRole(data.role?.toLowerCase() || "guest");
        const normalizeRole = (role) =>
          role?.toLowerCase().replace(/\s+/g, "_");

        const normalizedRole = normalizeRole(data.role);

        setRole(normalizedRole || "guest");
        setCompanyId(data.companyId);
        setDisplayName(`${data.firstName || ""} ${data.lastName || ""}`.trim());

        // Cache locally
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("role", data.role?.toLowerCase() || "guest");
        localStorage.setItem("companyId", data.companyId);

        // Optional: mark attendance
        const today = new Date();
        const day = today.getDate().toString();
        const monthId = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;

        if (data.companyId) {
          const attRef = doc(
            db,
            "companies",
            data.companyId,
            "attendance",
            monthId,
            "staff",
            uid
          );
          await setDoc(attRef, { [day]: true }, { merge: true });
        }
      } catch (err) {
        console.error("❌ Error loading Firestore user:", err);
        setUserData(null);
        setRole("guest");
        setCompanyId(null);
      } finally {
        //setLoading(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("oauth") === "success") {
      //setIsLoggedIn(true);
      //localStorage.setItem("isLoggedIn", "true");

      // Clean URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
    // else if (localStorage.getItem("isLoggedIn") === "true") {
    //   //setIsLoggedIn(true);
    // }
  }, []);


  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      setCurrentUser(null);
      setUserData(null);
      setRole("guest");
      setCompanyId(null);
      setDisplayName("");
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const value = {
    user: currentUser,
    userData,
    role,
    displayName,
    companyId,
    //loading,
    authReady,
    logout,
    //isLoggedIn,
    //setIsLoggedIn,
  };

  // Only show loading state when actually loading
  //if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!authReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: 20,
        }}
      >
        Loading...
      </div>
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}