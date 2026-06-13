//hvac-backend/routes/download.js
import express from "express";
import { google } from "googleapis";
import createOAuthClient from "../google/oauthClient.js";
import axios from "axios";

export default function downloadRoutes(CONFIG) {
  const router = express.Router();

  const { oauth2Client } = createOAuthClient(CONFIG);

  // router.get("/:fileId", async (req, res) => {
  //   try {
  //     // ✅ Get token from Authorization header instead of session
  //     const authHeader = req.headers.authorization;
  //     if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //       return res.status(401).json({ error: "Not authenticated" });
  //     }

  //     const token = authHeader.split(" ")[1]; // access_token
  //     console.log("RECEIVED TOKEN:", token);

  //     oauth2Client.setCredentials({ access_token: token });

  //     const drive = google.drive({ version: "v3", auth: oauth2Client });
  //     const fileId = req.params.fileId;

  //     // 1️⃣ Get file metadata
  //     const meta = await drive.files.get({
  //       fileId,
  //       fields: "name",
  //     });

  //     // 2️⃣ Set headers for download
  //     res.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename="${meta.data.name}"`
  //     );

  //     // 3️⃣ Stream file from Google Drive
  //     const response = await drive.files.get(
  //       { fileId, alt: "media" },
  //       { responseType: "stream" }
  //     );

  //     response.data.pipe(res);
  //   } catch (err) {
  //     console.error("Download error:", err);
  //     res.status(500).json({ error: "Download failed" });
  //   }
  // });

  router.get("/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;

    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await axios.get(url, {
      responseType: "stream",
    });

    res.setHeader("Content-Disposition", "attachment");

    response.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
});
  return router;
}
