//LeadsFileUpload.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

function UploadPage({ uploadedFiles = [], onFilesChange, resetTrigger }) {
  const [files, setFiles] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const saveGoogleRefreshToken = async (refreshToken) => {
    try {
      const uid = auth.currentUser?.uid;
      console.log("CURRENT UID:", uid);
      if (!uid) {
        console.error("No authenticated user");
        return;
      }

      console.log("💾 Saving refresh token to Firestore...");

      await setDoc(
        doc(db, "users", uid),
        {
          googleRefreshToken: refreshToken,
        },
        { merge: true }
      );

      console.log("✅ Refresh token saved to Firestore");
    } catch (err) {
      console.error("SAVE TOKEN ERROR:", err);
    }
  };

  useEffect(() => {
    if (resetTrigger) {
      setFiles([]);
      setSuccess("");
      setError("");
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [resetTrigger]);


  // ✅ 1
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔐 Auth state changed:", user?.uid);

      if (!user) {
        console.log("❌ No user logged in");
        setGoogleConnected(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data();

      console.log("📦 Firestore user data:", data);

      if (data?.googleRefreshToken) {
        console.log("✅ Google Drive CONNECTED for user:", user.uid);
        setGoogleConnected(true);
      } else {
        console.log("⚠️ Google Drive NOT connected");
        setGoogleConnected(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("RENDER googleConnected =", googleConnected);
  }, [googleConnected]);

  // ✅ 2. Listen for OAuth success event from Electron
  useEffect(() => {
    if (window.electron && window.electron.onOAuthSuccess) {
      // Receive tokens directly from Electron
      window.electron.onOAuthSuccess(async (tokens) => {
        try {
          console.log("AUTH USER:", auth.currentUser);
          console.log("⚡ OAuth success received", tokens);
          console.log("🔐 Tokens:", tokens);

          setError("");
          setSuccess("Google Drive connected successfully");

          if (tokens?.refreshToken) {
            await saveGoogleRefreshToken(tokens.refreshToken);
            console.log("💾 Storing Google tokens locally");
            // Store tokens locally for future requests
            localStorage.setItem("googleTokens", JSON.stringify(tokens));
            setGoogleConnected(true);
            // Unlock the UI immediately
            console.log("🚀 Google OAuth flow completed successfully");
          }
        } catch (e) {
          setError("Google authentication failed");
        }
      });
    }
  }, []);

  useEffect(() => {
    console.log(
      googleConnected
        ? "🟢 UI STATE: Google Drive CONNECTED → showing upload UI"
        : "🔴 UI STATE: Google Drive NOT connected → showing connect button"
    );
  }, [googleConnected]);



  const uploadFile = async () => {
    if (files.length === 0) {
      setError("Please select a file first");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const uid = auth.currentUser?.uid;

    const formData = new FormData();

    files.forEach(file => {

      formData.append("files", file);

    });
    formData.append("uid", uid);

    setUploadProgress(0);

    try {
      const res = await axios.post(
        "http://localhost:4000/upload",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );

            setUploadProgress(percent);
          },
        }
      );

      const newFiles = res.data.files;
      if (!newFiles || newFiles.length === 0) {
        throw new Error("No files returned from server.");
      }


      if (onFilesChange) {
        onFilesChange([...uploadedFiles, ...newFiles]);
      }

      setSuccess(
        `${newFiles.length} file(s) uploaded successfully.`
      );

      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    //catch (err) {
    //   console.error("Upload error:", err);
    //   alert("Upload failed");
    // }
    catch (err) {
      console.error("Upload error:", err);

      console.log(
        "SERVER RESPONSE:",
        err.response?.data
      );
      setError(
        err.response?.data?.message ||
        "Upload failed. Please try again."
      );
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const result = await window.electron.downloadFile(fileId, null, fileName);

      if (result?.success) {
        setSuccess("Download started.");

        setTimeout(() => {
          setSuccess("");
        }, 3000);
      } else {
        setError("Download failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Upload Documents</h2>
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {loading && (
        <div className="alert alert-info">
          Uploading file...
        </div>
      )}

      {loading && (
        <div className="mt-2">
          <div className="progress">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress}%
            </div>
          </div>
        </div>
      )}

      {!googleConnected && (
        <button onClick={() => window.api.send("open-google-login")}>
          Connect Google Drive
        </button>
      )}

      {googleConnected && (
        <>
          <input
            disabled={loading}
            ref={fileInputRef}
            type="file"

            multiple

            onChange={(e) => {

              const selected = Array.from(e.target.files);

              const oversized = selected.find(

                f => f.size > 100 * 1024 * 1024

              );

              if (oversized) {
                setFiles([]);

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }

                setError(`${oversized.name} exceeds 100 MB.`);
                return;
              }
              setError("");
              setSuccess("");

              setFiles(selected);

            }}
          />

          {files.length > 0 && (
            <div className="text-muted mb-2">
              {files.length} document{files.length !== 1 ? "s" : ""} selected
            </div>
          )}

          <button
            disabled={loading}
            onClick={uploadFile}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h5>Uploaded Documents</h5>

              {(uploadedFiles ?? []).map(file => (
                <div
                  key={file.fileId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 5,
                  }}
                >
                  <span>{file.name}</span>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(file.fileId, file.name)
                    }
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UploadPage;
