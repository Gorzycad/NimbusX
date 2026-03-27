// src/components/auth/Register.jsx
import React, { useEffect, useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, Link } from "react-router-dom";
import { ROLE_ACCESS } from "../../config/roleAccess";

// Convert snake_case roles to readable options
const ROLE_OPTIONS = Object.keys(ROLE_ACCESS).map((role) =>
  role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
);

function generate5DigitId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}


export default function Register() {
  const [mode, setMode] = useState("create");
  const [companyId, setCompanyId] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "",
    companyName: "",
  });

  const navigate = useNavigate();

  // Auto-generate Company ID
  useEffect(() => {
    if (mode === "create") {
      const id = generate5DigitId();
      setGeneratedId(id);
      setCompanyId(id);
    } else {
      setGeneratedId("");
      setCompanyId("");
    }
  }, [mode]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const checkCompanyExists = async (id) => {
    if (!id) return false;
    const snap = await getDoc(doc(db, "companies", id));
    return snap.exists();
  };

  const ensureUniqueCompanyId = async (candidate) => {
    let tries = 0;
    let id = candidate;
    while (tries < 5) {
      const exists = await checkCompanyExists(id);
      if (!exists) return id;
      id = generate5DigitId();
      tries++;
    }
    return `${candidate}${Date.now().toString().slice(-4)}`;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.role) {
      alert("Please fill all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (mode === "create" && !form.companyName) {
      alert("Please enter a company name.");
      return;
    }

    if (mode === "create" && companyId.length !== 5) {
      alert("Company ID must be exactly 5 digits.");
      return;
    }

    // 🔒 Restrict 3 special roles to developer company
    const restrictedRoles = ["developer", "app_support", "market_agent"];
    const devCompanyId = "75312";

    // If the role is restricted and the companyId is not developer's company
    if (restrictedRoles.includes(form.role) && companyId !== devCompanyId) {
      alert(
        `❌ The role "${form.role}" can only be registered under the developer's company.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const auth = getAuth();

      // 1️⃣ Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const uid = userCred.user.uid;
      localStorage.setItem("newlyRegisteredUser", uid);

      // 2️⃣ Update display name
      await updateProfile(userCred.user, {
        displayName: `${form.firstName} ${form.lastName}`,
      });

      // 3️⃣ Determine companyId
      let finalCompanyId = companyId;
      let logoUrl = "";

      if (mode === "create") {
        finalCompanyId = await ensureUniqueCompanyId(generatedId);

        // Upload logo if provided
        if (logoFile) {
          const storage = getStorage();
          const logoRef = ref(storage, `companies/${finalCompanyId}/logo.png`);
          await uploadBytes(logoRef, logoFile);
          logoUrl = await getDownloadURL(logoRef);
        }

        // Save company info
        await setDoc(doc(db, "companies", finalCompanyId), {
          companyName: form.companyName,
          companyLogoUrl: logoUrl || null,
          createdAt: serverTimestamp(),
          createdBy: uid,
          createdByEmail: form.email.trim(),
        });
      } else {
        // Joining existing company
        const exists = await checkCompanyExists(companyId);
        if (!exists) {
          alert("❌ Company ID not found.");
          setSubmitting(false);
          return;
        }
      }

      // 4️⃣ Prepare user profile
      const profileData = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email.trim(),
        role: form.role.toLowerCase().replace(/\s+/g, "_"),
        companyId: finalCompanyId,
        createdAt: serverTimestamp(),
      };

      // Save to companies/{companyId}/users/{uid}
      await setDoc(doc(db, "companies", finalCompanyId, "users", uid), profileData);

      // 5️⃣ Save to top-level users collection
      await setDoc(doc(db, "users", uid), {
        ...profileData,
        uid,
        createdAt: serverTimestamp(),
      });

      // 6️⃣ Send email verification
      await sendEmailVerification(userCred.user);

      alert(
        `🎉 Account created!\nA verification email has been sent to: ${form.email}\n\nPlease verify your email before signing in.`
      );

      window.location.href = "/login";
    } catch (err) {
      console.error("Register error:", err);
      alert("Registration failed: " + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return;

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 20 }}>
      <h2>Create Account</h2>

      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="radio"
            checked={mode === "create"}
            onChange={() => setMode("create")}
          />{" "}
          Create Company
        </label>
        <label style={{ marginLeft: 10 }}>
          <input
            type="radio"
            checked={mode === "join"}
            onChange={() => setMode("join")}
          />{" "}
          Join Existing Company
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="First name"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
          />
          <input
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
          />
        </div>

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          required
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            style={{ width: "100%", paddingRight: 50 }}
          />
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              color: "#007bff",
              userSelect: "none",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        <select
          value={form.role}
          onChange={(e) => handleChange("role", e.target.value)}
          required
        >
          <option value="">Select Role</option>
          {ROLE_OPTIONS.map((r) => {
            // Map back to snake_case for comparison
            const snakeRole = r.toLowerCase().replace(/ /g, "_");

            const restrictedRoles = ["developer", "app_support", "market_agent"];
            const devCompanyId = "75312";

            // Hide restricted roles if not the developer company
            if (restrictedRoles.includes(snakeRole) && companyId !== devCompanyId) {
              return null;
            }

            return <option key={r} value={r}>{r}</option>;
          })}
        </select>


        {mode === "create" ? (
          <>
            <div>
              <label>Company Name</label>
              <input
                placeholder="Enter company name"
                value={form.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
              />
            </div>

            <div>
              <label>Upload Company Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])}
              />
              {logoFile && (
                <img
                  src={URL.createObjectURL(logoFile)}
                  alt="Logo Preview"
                  style={{
                    height: 80,
                    marginTop: 8,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>

            <div>
              <label>Company ID (5 digits)</label>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={companyId}
                  maxLength={5}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    // allow only digits
                    const digitsOnly = e.target.value.replace(/\D/g, "");

                    // limit to 5 digits
                    const trimmed = digitsOnly.slice(0, 5);

                    setCompanyId(trimmed);
                    setGeneratedId(trimmed);
                  }}
                  placeholder="Enter 5-digit ID"
                />

                <button
                  type="button"
                  onClick={() => {
                    const newId = generate5DigitId();
                    setGeneratedId(newId);
                    setCompanyId(newId);
                  }}
                >
                  Regenerate
                </button>
              </div>

              {companyId.length > 0 && companyId.length < 5 && (
                <small style={{ color: "red" }}>
                  Company ID must be exactly 5 digits
                </small>
              )}
            </div>

          </>
        ) : (
          <div>
            <label>Company ID</label>
            <input
              value={companyId}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Enter 5-digit Company ID"
              onChange={(e) => {
                // Remove anything that is not a digit
                const digitsOnly = e.target.value.replace(/\D/g, "");

                // Limit to 5 digits
                setCompanyId(digitsOnly.slice(0, 5));
              }}
            />
          </div>

        )}

        <button type="submit" disabled={submitting}>
          {submitting
            ? "Creating account..."
            : mode === "create"
              ? "Create company & account"
              : "Join company & create account"}
        </button>

        <div style={{ marginTop: 10 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
