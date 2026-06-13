// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { getUserPermissions } from "../config/roleAccess";

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
  //const isBlocked = userData && !userData.accessEnabled;
  const unsubscribeUserRef = useRef(null);
  const unsubscribeCompanyRef = useRef(null);
  const lastCompanyIdRef = useRef(null);
  const [permissions, setPermissions] = useState([]);


  const isBlocked = userData?.accessEnabled === false;

  //BLOCK NEW USERS AFTER 7 DAYS
  useEffect(() => {

    if (!userData?.trialStartDate?.toDate) return;

    // already blocked
    if (userData.accessEnabled === false) return;

    // already paid
    if (userData.subscriptionPhase !== "trial") return;

    const startDate = userData.trialStartDate.toDate();

    const now = new Date();

    const diffDays =
      (now - startDate) / (1000 * 60 * 60 * 24);

    if (diffDays >= 7) {

      const disableAccess = async () => {

        try {

          await updateDoc(
            doc(db, "users", currentUser.uid),
            {
              accessEnabled: false,
            }
          );

          await updateDoc(
            doc(
              db,
              "companies",
              companyId,
              "users",
              currentUser.uid
            ),
            {
              accessEnabled: false,
            }
          );

        } catch (err) {
          console.error("Subscription block error:", err);
        }
      };

      disableAccess();
    }

  }, [userData, currentUser, companyId]);


  //BLOCK EXISTING USERS AFTER 5DAYS
  useEffect(() => {

    if (!userData) return;

    // ONLY ACTIVE SUBSCRIBERS
    if (userData.subscriptionPhase !== "active") return;

    // paid users always allowed
    if (userData.billingStatus === "paid") return;

    const today = new Date();

    const currentDay = today.getDate();

    // allow first 5 days
    if (currentDay <= 5) return;

    // already blocked
    if (userData.accessEnabled === false) return;

    const blockUser = async () => {

      try {

        await updateDoc(
          doc(db, "users", currentUser.uid),
          {
            accessEnabled: false,
          }
        );

        if (companyId) {

          await updateDoc(
            doc(
              db,
              "companies",
              companyId,
              "users",
              currentUser.uid
            ),
            {
              accessEnabled: false,
            }
          );
        }

      } catch (err) {

        console.error("Monthly subscription block error:", err);

      }
    };

    blockUser();

  }, [userData, currentUser, companyId]);

  // EMAIL VERIFICATION POLLING
  useEffect(() => {

    if (!currentUser) return;

    if (currentUser.emailVerified) return;

    console.log("⏳ Waiting for email verification...");

    let cancelled = false;
    let timeoutId;

    const checkVerification = async () => {

      if (cancelled) return;

      try {

        await currentUser.reload();

        // refresh current auth user
        const refreshedUser = auth.currentUser;

        if (!refreshedUser) return;

        if (refreshedUser.emailVerified) {

          console.log("✅ Email verified detected");

          window.location.href = "/login";

          return;
        }

        timeoutId = setTimeout(checkVerification, 10000);

      } catch (err) {

        console.error("Email verification check failed:", err);

      }
    };

    timeoutId = setTimeout(checkVerification, 10000);

    return () => {

      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

  }, [currentUser]);

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
      if (unsubscribeUserRef.current) unsubscribeUserRef.current();
      if (unsubscribeCompanyRef.current) unsubscribeCompanyRef.current();

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
        lastCompanyIdRef.current = null; // ✅ ADD THIS
        return;
      }

      setCurrentUser(firebaseUser);

      const normalizeRole = (role) =>
        role?.toLowerCase().replace(/\s+/g, "_");
      try {
        // Force refresh to include latest custom claims
        if (!firebaseUser.emailVerified) {
          await firebaseUser.getIdToken(true);
        }

        // Optional: keep for debugging only
        const tokenResult = await firebaseUser.getIdTokenResult();
        console.log("🔥 Custom claims (debug only):", tokenResult.claims);

        const uid = firebaseUser.uid;
        const userRef = doc(db, "users", uid);

        // 🔥 REAL-TIME LISTENER (THIS FIXES YOUR ISSUE)
        unsubscribeUserRef.current = onSnapshot(userRef, async (userSnap) => {
          if (!userSnap.exists()) {
            console.warn("⏳ User doc not ready yet... waiting");

            //setAuthReady(true);
            return;
          }

          const data = userSnap.data();

          setUserData(data);
          const normalizedRole = normalizeRole(data.role);

          setRole(normalizedRole || "guest");
          setCompanyId(data.companyId);

          // 🔥 THIS WILL NOW UPDATE HEADER INSTANTLY
          setDisplayName(
            `${data.firstName || ""} ${data.lastName || ""}`.trim()
          );

          const resolvedPermissions = getUserPermissions(
            normalizedRole,
            data.customPermissions || {}
          );

          setPermissions(resolvedPermissions);


          // Cache locally
          localStorage.setItem("user", JSON.stringify(data));
          localStorage.setItem("role", data.role?.toLowerCase() || "guest");
          localStorage.setItem("companyId", data.companyId);
          localStorage.setItem("companyLogo", data.companyLogoUrl || "");


          // 🔥 COMPANY LISTENER
          if (data?.companyId && lastCompanyIdRef.current !== data.companyId) {
            lastCompanyIdRef.current = data.companyId;

            if (unsubscribeCompanyRef.current) {
              unsubscribeCompanyRef.current();
            }
            const companyRef = doc(db, "companies", data.companyId);

            unsubscribeCompanyRef.current = onSnapshot(companyRef, (snap) => {
              if (snap.exists()) {
                const companyData = snap.data();

                setCompanyName(companyData.companyName || "");
                setCompanyLogo(companyData.companyLogo || null);

                localStorage.setItem("companyLogo", JSON.stringify(companyData.companyLogo || null));
                localStorage.setItem("companyName", companyData.companyName || "");
              }
            });
          }


        });

      } catch (err) {
        console.error("❌ Error loading Firestore user:", err);
        //setRole("guest");
        setUserData(null);
        setCompanyId(null);


      }
      finally {
        setAuthReady(true);
      }
    });

    return () => {

      unsubscribe && unsubscribe();

      if (unsubscribeUserRef.current) {
        unsubscribeUserRef.current();
      }

      if (unsubscribeCompanyRef.current) {
        unsubscribeCompanyRef.current();
      }



    };
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
    permissions,
    displayName,
    companyId,
    companyLogo, //ADD this
    companyName,
    authReady,
    isBlocked,
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