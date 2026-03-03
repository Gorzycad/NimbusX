// src/components/auth/ForgotPassword.jsx
import React, { useState } from "react";
import { auth } from "../../firebase/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleResetPassword = async () => {
        setError("");
        setMessage("");

        if (!email) {
            setError("Please enter your email.");
            return;
        }

        setLoading(true);
        try {
            // Firebase will send a password reset link if email exists
            await sendPasswordResetEmail(auth, email.trim());

            setMessage(
                "✅ Password reset link sent to your email. \n ⚠️ If you don’t see the email in your inbox, please check your spam/junk folder."
            );

            // Redirect to login after 5 seconds
            setTimeout(() => navigate("/login"), 5000);
        } catch (err) {
            console.error("Password reset error:", err);

            if (err.code === "auth/user-not-found") {
                setError("Email not found. Please check and try again.");
            } else if (err.code === "auth/invalid-email") {
                setError("Invalid email format. Please check your input.");
            } else {
                setError("Failed to send reset link. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "50px auto", padding: 20 }}>
            <h2>Reset Password</h2>

            {error && <p style={{ color: "red" }}>{error}</p>}
            {message && (
                <p style={{ color: "green", whiteSpace: "pre-line" }}>
                    {message}
                </p>
            )}


            <label>Email</label>
            <input
                type="email"
                placeholder="Enter your account email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "15px",
                    border: "1px solid #ccc",
                }}
            />

            <button
                onClick={handleResetPassword}
                disabled={loading}
                style={{
                    width: "100%",
                    padding: "10px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                }}
            >
                {loading ? "Processing..." : "Reset Password"}
            </button>
        </div>
    );
}
