// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState("guest");
  const [displayName, setDisplayName] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const cachedName = localStorage.getItem("companyName");
    if (cachedName) setCompanyName(cachedName);
  }, []);

  useEffect(() => {
    const cachedLogo = localStorage.getItem("companyLogo");

    if (cachedLogo) {
      setCompanyLogo(JSON.parse(cachedLogo));
    }
  }, []);

  useEffect(() => {
    // Listen for OAuth success from Electron
    if (window.electron?.onOAuthSuccess) {
      window.electron.onOAuthSuccess(() => {
        console.log("✅ OAuth success received from Electron");


        // optional: redirect user to dashboard
        window.location.href = "/CompanyDashboard/leads";
      });
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

      console.log("🔥 Firebase auth state changed:", firebaseUser);
      setAuthReady(false);

      if (!firebaseUser) {
        // No user logged in, skip Firestore reads
        setCurrentUser(null);
        setUserData(null);
        setRole("guest");
        setCompanyId(null);
        setDisplayName("");
        setAuthReady(true);
        return;
      }

      setCurrentUser(firebaseUser);

      // 🔁 Auto-refresh email verification status
      if (firebaseUser && !firebaseUser.emailVerified) {
        console.log("⏳ Waiting for email verification...");

        const interval = setInterval(async () => {
          await firebaseUser.reload(); // 🔥 VERY IMPORTANT

          if (firebaseUser.emailVerified) {
            console.log("✅ Email verified detected!");

            clearInterval(interval);

            // Force token refresh so claims + auth update
            await firebaseUser.getIdToken(true);

            // 🔄 Trigger full auth reload
            window.location.href = "/login";
          }
        }, 3000); // check every 3 seconds

        setAuthReady(true);
        return;
      }

      const normalizeRole = (role) =>
        role?.toLowerCase().replace(/\s+/g, "_");
      try {
        // Force refresh to include latest custom claims
        await firebaseUser.getIdToken(true);

        // Optional: keep for debugging only
        const tokenResult = await firebaseUser.getIdTokenResult();
        console.log("🔥 Custom claims (debug only):", tokenResult.claims);
        const uid = firebaseUser.uid;

        // Fetch user data from top-level /users collection
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        console.log("📄 userSnap:", userSnap.exists(), userSnap.data());

        if (!userSnap.exists()) {
          console.warn("⏳ User doc not ready yet... waiting");

          setAuthReady(true);
          return;
        }

        // if (!userSnap.exists()) {
        //   console.warn("⏳ User doc not ready yet, retrying...");

        //   setTimeout(() => {
        //     window.location.reload();
        //   }, 1000);

        //   return;
        // }

        const data = userSnap.data();

        setUserData(data);


        const normalizedRole = normalizeRole(data.role);

        setRole(normalizedRole || "guest");
        setCompanyId(data.companyId);
        setDisplayName(`${data.firstName || ""} ${data.lastName || ""}`.trim());


        // Cache locally
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("role", data.role?.toLowerCase() || "guest");
        localStorage.setItem("companyId", data.companyId);
        localStorage.setItem("companyLogo", data.companyLogoUrl || "");

        if (data?.companyId) {
          if (role !== "company_admin") {
            return <p>Only admin can upload logo</p>;
          }
          const companyRef = doc(db, "companies", data.companyId);

          onSnapshot(companyRef, (snap) => {
            if (snap.exists()) {
              const companyData = snap.data();

              setCompanyName(companyData.companyName || "");
              setCompanyLogo(companyData.companyLogo || null);

              localStorage.setItem("companyLogo", JSON.stringify(companyData.companyLogo || null));
              localStorage.setItem("companyName", companyData.companyName || "");
            }
          });
        }
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
          try {
            if (data.companyId && ["company_admin", "developer"].includes(normalizedRole)) {
              await setDoc(attRef, { [day]: true }, { merge: true });
            }
          } catch (e) {
            console.warn("⚠️ Attendance write failed:", e.message);
          }
        }

      } catch (err) {
        console.error("❌ Error loading Firestore user:", err);
        //setRole("guest");
        setUserData(null);
        setCompanyId(null);

        // // fallback to claims instead of killing role
        // try {
        //   const tokenResult = await firebaseUser.getIdTokenResult();
        //   const claimRole = tokenResult.claims.role;

        //   setRole(claimRole || "guest");
        //   setCompanyId(tokenResult.claims.companyId || null);
        // } catch {
        //   setRole("guest");
        // }
      }
      finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("oauth") === "success") {

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

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
    companyLogo, //ADD this
    companyName,
    authReady,
    logout,
  };

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