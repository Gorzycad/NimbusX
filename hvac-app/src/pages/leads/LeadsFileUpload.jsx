//LeadsFileUpload.jsx
import { useState, useEffect } from "react";
import axios from "axios";

function UploadPage({ uploadedFiles = [], onFilesChange })  {
  const [file, setFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicDownloadLink, setPublicDownloadLink] = useState("");

  // ✅ 1. Check login state from localStorage first
  useEffect(() => {
    const storedLogin = localStorage.getItem("googleLoggedIn") === "true";

    if (storedLogin) {
      setIsLoggedIn(true);
    }

    // Also verify with backend
    axios
      .get("http://localhost:4000/auth/status", { withCredentials: true })
      .then((res) => {
        if (res.data.authenticated) {
          setIsLoggedIn(true);
          localStorage.setItem("googleLoggedIn", "true");

          if (res.data.tokens) {
            localStorage.setItem(
              "googleTokens",
              JSON.stringify(res.data.tokens)
            );
          }
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, []);

  // ✅ 2. Listen for OAuth success event from Electron
  // ✅ 2. Listen for OAuth success event from Electron
useEffect(() => {
  if (window.electron && window.electron.onOAuthSuccess) {
    // Receive tokens directly from Electron
    window.electron.onOAuthSuccess((tokens) => {
      console.log("⚡ OAuth success received", tokens);

      if (tokens) {
        // Store tokens locally for future requests
        localStorage.setItem("googleTokens", JSON.stringify(tokens));
        localStorage.setItem("googleLoggedIn", "true");

        // Unlock the UI immediately
        setIsLoggedIn(true);
      } else {
        console.warn("⚠️ OAuth tokens are undefined!");
      }
    });
  }
}, []);

  
  const uploadFile = async () => {
  if (!file) return alert("Please select a file first");

  const tokens = JSON.parse(localStorage.getItem("googleTokens"));
console.log("TOKENS:", tokens);

const token = tokens?.access_token;
console.log("ACCESS TOKEN:", token);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post("http://localhost:4000/upload", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const newFile = {
  fileId: res.data.fileId,
  name: res.data.fileName,
  url: res.data.downloadLink
};

setUploadedFileId(res.data.fileId);
setUploadedFileName(res.data.fileName);
setPublicDownloadLink(res.data.downloadLink);

// send file to parent
if (onFilesChange) {
  onFilesChange([...uploadedFiles, newFile]);
}

    alert(`Uploaded: ${res.data.fileName}`);
  } catch (err) {
    console.error("Upload error:", err);
    alert("Upload failed");
  }
};
  
  const downloadFile = async (fileId, fileName) => {
  const tokens = JSON.parse(localStorage.getItem("googleTokens"));
  const token = tokens?.access_token;

  if (!token) {
    alert("You must login first");
    return;
  }

  const result = await window.electron.downloadFile(fileId, token,fileName);

  if (result?.success) {
    alert("File downloaded successfully");
  } else {
    alert("Download failed");
  }
};
  return (
    <div>
      <h2>Upload a File</h2>

      {!isLoggedIn && (
        <button onClick={() => window.api.send("open-google-login")}>
          Sign in with Google
        </button>
      )}

      {isLoggedIn && (
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
