// ✅ src/components/auth/Logout.jsx
import React, { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      try {
        await signOut(auth);
        navigate("/login"); // redirect after sign out
      } catch (err) {
        console.error("Logout error:", err);
        alert("Failed to sign out: " + (err?.message || err));
      }
    };
    doLogout();
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h3>Signing out...</h3>
    </div>
  );
}
