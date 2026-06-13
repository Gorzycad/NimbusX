//LeadsFileUpload.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

function UploadPage({ uploadedFiles = [], onFilesChange }) {
  const [file, setFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [publicDownloadLink, setPublicDownloadLink] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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


  // ✅ 1
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔐 Auth state changed:", user?.uid);

      if (!user) {
        console.log("❌ No user logged in");
        setGoogleConnected(false);
        console.log("RENDER googleConnected =", googleConnected);
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
    console.log("RENDER googleConnected =", googleConnected);
    return () => unsubscribe();
  }, []);

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
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const uid = auth.currentUser?.uid;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uid", uid);

    try {
      const res = await axios.post(
        "http://localhost:4000/upload",
        formData
      );

      const newFile = {
        fileId: res.data.fileId,
        name: res.data.fileName,
        url: res.data.downloadLink,
      };

      setUploadedFileId(res.data.fileId);
      setUploadedFileName(res.data.fileName);
      setPublicDownloadLink(res.data.downloadLink);

      if (onFilesChange) {
        onFilesChange([...uploadedFiles, newFile]);
      }

      setSuccess(`Uploaded: ${res.data.fileName}`);
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
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const result = await window.electron.downloadFile(fileId, null, fileName);

      if (result?.success) {
        alert("File downloaded successfully");
      } else {
        alert("Download failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Upload a File</h2>
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

      {!googleConnected && (
        <button onClick={() => window.api.send("open-google-login")}>
          Connect Google Drive
        </button>
      )}

      {googleConnected && (
        <>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button onClick={uploadFile}>
            Upload
          </button>

          {uploadedFileId && (
            <div style={{ marginTop: "15px" }}>
              <button onClick={() => downloadFile(uploadedFileId, uploadedFileName)}>
                Download File
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UploadPage;
