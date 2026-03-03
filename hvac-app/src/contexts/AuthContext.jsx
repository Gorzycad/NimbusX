// // src/contexts/AuthContext.jsx
// import React, { createContext, useContext, useEffect, useState } from "react";
// import { onAuthStateChanged, getAuth, signOut } from "firebase/auth";
// import { doc, getDoc, setDoc } from "firebase/firestore";
// import { auth, db } from "../firebase/firebase";

// const AuthContext = createContext();
// export const useAuth = () => useContext(AuthContext);

// export function AuthProvider({ children }) {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [userData, setUserData] = useState(null);
//   const [role, setRole] = useState("guest");
//   const [displayName, setDisplayName] = useState("");
//   const [companyId, setCompanyId] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//       if (!firebaseUser) {
//         // User is logged out
//         setCurrentUser(null);
//         setUserData(null);
//         setRole("guest");
//         setCompanyId(null);
//         setDisplayName("");
//         setLoading(false);
//         return;
//       }

//       setCurrentUser(firebaseUser);
//       setLoading(true);

//       try {
//         // Get companyId from localStorage or from the user's document
//         let storedCompanyId = localStorage.getItem("companyId");
//         if (!storedCompanyId) {
//           // Optional: fallback to companyId in user profile (if stored during registration)
//           console.warn("⚠ No companyId in localStorage. Cannot fetch user data safely.");
//           setUserData(null);
//           setLoading(false);
//           return;
//         }

//         // New: fetch from top-level users collection
//         const userRef = doc(db, "users", firebaseUser.uid);
//         const userSnap = await getDoc(userRef);

//         if (!userSnap.exists()) {
//           console.error("❌ User document not found in top-level users collection.");
//           // setCurrentUser(null);
//           // setUserData(null);
//           // setRole("guest");
//           // setCompanyId(null);
//           // setDisplayName("");
//           setLoading(false);
//           return;
//         }

//         const data = userSnap.data();
//         localStorage.setItem("companyId", data.companyId);

//         setUserData(data);
//         setRole(data.role?.toLowerCase() || "guest");
//         setCompanyId(data.companyId);
//         setDisplayName(`${data.firstName || ""} ${data.lastName || ""}`.trim());

//         // Cache locally for next session
//         localStorage.setItem("user", JSON.stringify(data));
//         localStorage.setItem("role", data.role?.toLowerCase() || "guest");
//         //localStorage.setItem("companyId", storedCompanyId);

//         // Mark daily attendance safely
//         const today = new Date();
//         const day = today.getDate().toString(); // "1"–"31"
//         const monthId = `${today.getFullYear()}-${(today.getMonth() + 1)
//           .toString()
//           .padStart(2, "0")}`;
//         if (!storedCompanyId) {
//           console.warn("Company ID missing. Skipping attendance mark.");
//         } else {
//           const attRef = doc(db, "companies", storedCompanyId, "attendance", monthId, "staff", firebaseUser.uid);
//           await setDoc(attRef, { [day]: true }, { merge: true });
//         }

//       } catch (err) {
//         console.error("❌ Error loading Firestore user:", err);
//         setUserData(null);
//         setRole("guest");
//         setCompanyId(null);
//       } finally {
//         setLoading(false);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const logout = async () => {
//     try {
//       await signOut(auth);
//       localStorage.clear();
//       setCurrentUser(null);
//       setUserData(null);
//       setRole("guest");
//       setCompanyId(null);
//       setDisplayName("");
//       window.location.href = "/login";
//     } catch (err) {
//       console.error("Logout error:", err);
//     }
//   };

//   const value = {
//     user: currentUser,
//     userData,
//     role,
//     displayName,
//     companyId,
//     loading,
//     logout,
//   };

//   if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }




// // src/contexts/AuthContext.jsx
// import React, { createContext, useContext, useEffect, useState } from "react";
// import { onAuthStateChanged, getAuth, signOut } from "firebase/auth";
// import { doc, getDoc, setDoc } from "firebase/firestore";
// import { auth, db } from "../firebase/firebase";

// const AuthContext = createContext();
// export const useAuth = () => useContext(AuthContext);

// export function AuthProvider({ children }) {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [userData, setUserData] = useState(null);
//   const [role, setRole] = useState("guest");
//   const [displayName, setDisplayName] = useState("");
//   const [companyId, setCompanyId] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//       if (!firebaseUser) {
//         // User logged out
//         setCurrentUser(null);
//         setUserData(null);
//         setRole("guest");
//         setCompanyId(null);
//         setDisplayName("");
//         setLoading(false);
//         return;
//       }

//       setCurrentUser(firebaseUser);
//       setLoading(true);

//       try {
//         // ⚡ Force refresh token to get latest custom claims
//         await firebaseUser.getIdToken(true);

//         const uid = firebaseUser.uid;

//         // Fetch top-level users/{uid} doc
//         const userRef = doc(db, "users", uid);
//         const userSnap = await getDoc(userRef);

//         if (!userSnap.exists()) {
//           console.error("❌ User document not found:", uid);
//           setCurrentUser(null);
//           setUserData(null);
//           setRole("guest");
//           setCompanyId(null);
//           setDisplayName("");
//           setLoading(false);
//           return;
//         }

//         const data = userSnap.data();

//         setUserData(data);
//         setRole(data.role?.toLowerCase() || "guest");
//         setCompanyId(data.companyId);
//         setDisplayName(`${data.firstName || ""} ${data.lastName || ""}`.trim());

//         // Cache locally
//         localStorage.setItem("user", JSON.stringify(data));
//         localStorage.setItem("role", data.role?.toLowerCase() || "guest");
//         localStorage.setItem("companyId", data.companyId);

//         // Optional: mark attendance
//         const today = new Date();
//         const day = today.getDate().toString();
//         const monthId = `${today.getFullYear()}-${(today.getMonth() + 1)
//           .toString()
//           .padStart(2, "0")}`;
//         const attRef = doc(
//           db,
//           "companies",
//           data.companyId,
//           "attendance",
//           monthId,
//           "staff",
//           uid
//         );
//         await setDoc(attRef, { [day]: true }, { merge: true });
//       } catch (err) {
//         console.error("❌ Error loading Firestore user:", err);
//         setUserData(null);
//         setRole("guest");
//         setCompanyId(null);
//       } finally {
//         setLoading(false);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const logout = async () => {
//     try {
//       await signOut(auth);
//       localStorage.clear();
//       setCurrentUser(null);
//       setUserData(null);
//       setRole("guest");
//       setCompanyId(null);
//       setDisplayName("");
//       window.location.href = "/login";
//     } catch (err) {
//       console.error("Logout error:", err);
//     }
//   };

//   const value = {
//     user: currentUser,
//     userData,
//     role,
//     displayName,
//     companyId,
//     loading,
//     logout,
//   };

//   if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }



// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState("guest");
  const [displayName, setDisplayName] = useState("");
  const [companyId, setCompanyId] = useState(null);
  //const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      //setLoading(true);
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
          setRole(tokenResult.claims.role || "guest");
          setCompanyId(tokenResult.claims.companyId || null);
          setDisplayName(firebaseUser.email || "");

          //setLoading(false);
          setAuthReady(true);
          return;
        }

        const data = userSnap.data();

        setUserData(data);
        setRole(data.role?.toLowerCase() || "guest");
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
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");

    // Clean URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  } else if (localStorage.getItem("isLoggedIn") === "true") {
    setIsLoggedIn(true);
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
    //loading,
    authReady,
    logout,
    isLoggedIn,
    setIsLoggedIn,
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
        Signing in...
      </div>
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}