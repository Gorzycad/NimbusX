import express from "express";
import { google } from "googleapis";
import createOAuthClient from "../google/oauthClient.js";

export default function downloadRoutes(CONFIG) {
  const router = express.Router();

  const { oauth2Client } = createOAuthClient(CONFIG);

  router.get("/:fileId", async (req, res) => {
    try {
      // ✅ Use session (NOT global)
      if (!req.session.googleTokens) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      oauth2Client.setCredentials(req.session.googleTokens);

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const fileId = req.params.fileId;

      // 1️⃣ Get file metadata
      const meta = await drive.files.get({
        fileId,
        fields: "name",
      });

      // 2️⃣ Set headers
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${meta.data.name}"`
      );

      // 3️⃣ Stream file
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      response.data.pipe(res);
    } catch (err) {
      console.error("Download error:", err);
      res.status(500).json({ error: "Download failed" });
    }
  });

  return router;
}

