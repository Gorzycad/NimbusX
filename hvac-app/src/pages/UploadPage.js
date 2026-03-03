import { useState, useEffect } from "react";
import axios from "axios";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicDownloadLink, setPublicDownloadLink] = useState("");

  // Check if OAuth login was successful
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") {
      setIsLoggedIn(true);
    }
  }, []);

  // Upload file
  const uploadFile = async () => {
    if (!file) return alert("Please select a file first");
    if (!isLoggedIn) return alert("You must login first");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:4000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadedFileId(res.data.fileId);
      setUploadedFileName(res.data.fileName);
      setPublicDownloadLink(res.data.downloadLink);
      alert(`Uploaded: ${res.data.fileName}`);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  };

  return (
    <div>
      <h2>Upload a File</h2>

      {/* {!isLoggedIn && (
        <a href="http://localhost:4000/auth/google">
          <button>Sign in with Google</button>
        </a>
      )} */}
      {!isLoggedIn && (
        <button
          onClick={() => {
            const currentUrl = window.location.href;
            window.location.href = `http://localhost:4000/auth/google?redirect=${encodeURIComponent(
              currentUrl
            )}`;
          }}
        >
          Sign in with Google
        </button>
      )}


      {isLoggedIn && (
        <>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button onClick={uploadFile}>Upload</button>

          {publicDownloadLink && (
            <div style={{ marginTop: "15px" }}>
              <a
                href={publicDownloadLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download (Public)
              </a>
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default UploadPage;
