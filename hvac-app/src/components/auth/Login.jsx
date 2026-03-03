// // src/components/auth/Login.jsx
// import React, { useState } from "react";
// import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
// import { collection, getDocs, doc, getDoc } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useNavigate, Link } from "react-router-dom";

// export default function Login() {
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const navigate = useNavigate();

//   const handleChange = (key, value) =>
//     setForm((prev) => ({ ...prev, [key]: value }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // Clear previous session
//       localStorage.clear();

//       const auth = getAuth();
//       const userCred = await signInWithEmailAndPassword(
//         auth,
//         form.email.trim(),
//         form.password
//       );

//       const uid = userCred.user.uid;

//       // Enforce email verification
//       if (!userCred.user.emailVerified) {
//         await signOut(auth);
//         alert("Please verify your email before logging in.");
//         setLoading(false);
//         return;
//       }

//       // Try to get companyId from localStorage first
//       let companyId = localStorage.getItem("companyId");

//       // If not in localStorage, fetch from Firestore
//       let userData = null;
//       if (!companyId) {
//         const companiesSnap = await getDocs(collection(db, "companies"));
//         for (const companyDoc of companiesSnap.docs) {
//           const uidRef = doc(db, `companies/${companyDoc.id}/users/${uid}`);
//           const uidSnap = await getDoc(uidRef);
//           if (uidSnap.exists()) {
//             userData = uidSnap.data();
//             companyId = companyDoc.id;
//             // Cache locally
//             localStorage.setItem("companyId", companyId);
//             localStorage.setItem("user", JSON.stringify(userData));
//             localStorage.setItem("role", (userData.role || "guest").toLowerCase());
//             break;
//           }
//         }
//       }

//       if (!companyId || !userData) {
//         alert("User not found in any company. Please contact your admin.");
//         await signOut(auth);
//         setLoading(false);
//         return;
//       }

//       // If userData not already fetched, get it now
//       if (!userData) {
//         const userRef = doc(db, `companies/${companyId}/users/${uid}`);
//         const userSnap = await getDoc(userRef);
//         if (userSnap.exists()) {
//           userData = userSnap.data();
//           localStorage.setItem("user", JSON.stringify(userData));
//           localStorage.setItem("role", (userData.role || "guest").toLowerCase());
//         } else {
//           alert("User profile not found. Please contact your admin.");
//           await signOut(auth);
//           setLoading(false);
//           return;
//         }
//       }

//       console.log("✅ Login successful:", userData, companyId);

//       // HARD redirect to dashboard
//       window.location.href = "/CompanyDashboard";
//     } catch (err) {
//       console.error("❌ Login error:", err);
//       alert("Login failed: " + (err?.message || err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 400, margin: "60px auto", padding: 20 }}>
//       <h2>Sign In</h2>
//       <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
//         <input
//           type="email"
//           placeholder="Email"
//           value={form.email}
//           onChange={(e) => handleChange("email", e.target.value)}
//         />

//         <div style={{ position: "relative" }}>
//           <input
//             type={showPassword ? "text" : "password"}
//             placeholder="Password"
//             value={form.password}
//             onChange={(e) => handleChange("password", e.target.value)}
//             style={{ width: "100%", paddingRight: "50px" }}
//           />
//           <span
//             onClick={() => setShowPassword((prev) => !prev)}
//             style={{
//               position: "absolute",
//               right: 10,
//               top: "50%",
//               transform: "translateY(-50%)",
//               cursor: "pointer",
//               fontSize: "12px",
//               color: "#007bff",
//               userSelect: "none",
//             }}
//           >
//             {showPassword ? "Hide" : "Show"}
//           </span>
//         </div>

//         <button type="submit" disabled={loading}>
//           {loading ? "Signing in..." : "Sign In"}
//         </button>
//       </form>

//       <div style={{ marginTop: 12 }}>
//         Don’t have an account? <Link to="/register">Register</Link>
//       </div>
//       <div style={{ marginTop: 12 }}>
//         Forgot your password? <Link to="/forgotpassword">Reset password</Link>
//       </div>
//     </div>
//   );
// }


// src/components/auth/Login.jsx
import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useNavigate, Link } from "react-router-dom";
import { setDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  
  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clear previous session
      localStorage.clear();

      const auth = getAuth();
      const userCred = await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      const firebaseUser = userCred.user;

      // Enforce email verification
      if (!firebaseUser.emailVerified) {
        await signOut(auth);
        alert("Please verify your email before logging in.");
        setLoading(false);
        return;
      }

      const uid = firebaseUser.uid;


      // Force refresh the token to get the latest custom claims
      await firebaseUser.getIdToken(true);

      // 🔄 Auto-create / sync global user profile
      await setDoc(
        doc(db, "users", uid),
        {
          displayName:
            firebaseUser.displayName ||
            form.email.split("@")[0],
          email: firebaseUser.email,
          lastLoginAt: serverTimestamp(),
        },
        { merge: true } // 👈 VERY IMPORTANT
      );

      const globalUserSnap = await getDoc(doc(db, "users", uid));

      if (globalUserSnap.exists()) {
        const globalUser = globalUserSnap.data();
        const role = globalUser.role?.toLowerCase();

        if (["developer", "app_support", "market_agent"].includes(role)) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              uid,
              displayName: globalUser.displayName,
              role,
            })
          );
          localStorage.setItem("role", role);

          // ...after successful login:
          navigate("/CompanyDashboard", { replace: true });
          //window.location.reload();
          //window.location.href = "/CompanyDashboard";
          return; // 🚨 STOP HERE — no company lookup
        }
      }

      // ✅ Inspect custom claims
      const token = await firebaseUser.getIdTokenResult();
      console.log("Custom claims:", token.claims);

      // Now you can safely use companyId from claims if needed
      const companyIdFromClaims = token.claims.companyId;
      console.log("Company ID from token:", companyIdFromClaims);

      // Only perform Firestore reads AFTER login
      //let companyId = localStorage.getItem("companyId");
      //let userData = null;

      const userRef = doc(db, `users/${uid}`);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");

      const userData = userSnap.data();
      const companyId = userData.companyId;

      if (!companyId) {
        const companiesSnap = await getDocs(collection(db, "companies"));

        for (const companyDoc of companiesSnap.docs) {
          const uidRef = doc(db, `companies/${companyDoc.id}/users/${uid}`);
          const uidSnap = await getDoc(uidRef);

          if (uidSnap.exists()) {
            userData = uidSnap.data();
            companyId = companyDoc.id;

            // Cache locally
            localStorage.setItem("companyId", companyId);
            localStorage.setItem("user", JSON.stringify(userData));
            localStorage.setItem(
              "role",
              (userData.role || "guest").toLowerCase()
            );
            break;
          }
        }
      }

      if (!companyId || !userData) {
        alert("User not found in any company. Please contact your admin.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      // If userData still not set, fetch directly
      if (!userData) {
        const userRef = doc(db, `companies/${companyId}/users/${uid}`);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userData = userSnap.data();
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem(
            "role",
            (userData.role || "guest").toLowerCase()
          );
        } else {
          alert("User profile not found. Please contact your admin.");
          await signOut(auth);
          setLoading(false);
          return;
        }
      }

      console.log("✅ Login successful:", userData, companyId);

      // HARD redirect to dashboard
      // ...after successful login:
      navigate("/CompanyDashboard", { replace: true });
      //window.location.reload();
      //window.location.href = "/CompanyDashboard";
    } catch (err) {
      console.error("❌ Login error:", err);
      alert("Login failed: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: 20 }}>
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            style={{ width: "100%", paddingRight: "50px" }}
          />
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontSize: "12px",
              color: "#007bff",
              userSelect: "none",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        Don’t have an account? <Link to="/register">Register</Link>
      </div>
      <div style={{ marginTop: 12 }}>
        Forgot your password? <Link to="/forgotpassword">Reset password</Link>
      </div>
    </div>
  );
}
