//hvac-backend/routes/download.js
import express from "express";
import { google } from "googleapis";
import createOAuthClient from "../google/oauthClient.js";

export default function downloadRoutes(CONFIG) {
  const router = express.Router();

  const { oauth2Client } = createOAuthClient(CONFIG);

  router.get("/:fileId", async (req, res) => {
    try {
      // ✅ Get token from Authorization header instead of session
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const token = authHeader.split(" ")[1]; // access_token
      console.log("RECEIVED TOKEN:", token);
      
      oauth2Client.setCredentials({ access_token: token });

      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const fileId = req.params.fileId;

      // 1️⃣ Get file metadata
      const meta = await drive.files.get({
        fileId,
        fields: "name",
      });

      // 2️⃣ Set headers for download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${meta.data.name}"`
      );

      // 3️⃣ Stream file from Google Drive
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

// // hvac-backend/routes/download.js
// import express from "express";
// import { google } from "googleapis";
// import path from "path";
// import os from "os";
// import fs from "fs";
// import createOAuthClient from "../google/oauthClient.js";

// export default function downloadRoutes(CONFIG) {
//   const router = express.Router();

//   const { oauth2Client } = createOAuthClient(CONFIG);

//   // Safe temporary folder for caching downloads if needed
//   const tempDir = path.join(os.homedir(), "hvacapp_downloads");
//   if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir, { recursive: true });
//   }

//   router.get("/:fileId", async (req, res) => {
//     try {
//       if (!req.session.googleTokens) {
//         return res.status(401).json({ error: "Not authenticated" });
//       }

//       oauth2Client.setCredentials(req.session.googleTokens);

//       const drive = google.drive({ version: "v3", auth: oauth2Client });
//       const fileId = req.params.fileId;

//       // 1️⃣ Get file metadata
//       const meta = await drive.files.get({
//         fileId,
//         fields: "name",
//       });

//       // 2️⃣ Set headers
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="${meta.data.name}"`
//       );

//       // 3️⃣ Stream file directly from Google Drive
//       const response = await drive.files.get(
//         { fileId, alt: "media" },
//         { responseType: "stream" }
//       );

//       // Pipe the data directly to response
//       response.data.pipe(res);

//       // Optional: handle stream errors
//       response.data.on("error", (err) => {
//         console.error("Stream error:", err);
//         res.end();
//       });
//     } catch (err) {
//       console.error("Download error:", err);
//       res.status(500).json({ error: "Download failed" });
//     }
//   });

//   return router;
// }

// import express from "express";
// import { google } from "googleapis";
// import createOAuthClient from "../google/oauthClient.js";

// export default function downloadRoutes(CONFIG) {
//   const router = express.Router();

//   const { oauth2Client } = createOAuthClient(CONFIG);

//   router.get("/:fileId", async (req, res) => {
//     try {
//       // ✅ Use session (NOT global)
//       if (!req.session.googleTokens) {
//         return res.status(401).json({ error: "Not authenticated" });
//       }

//       oauth2Client.setCredentials(req.session.googleTokens);

//       const drive = google.drive({ version: "v3", auth: oauth2Client });

//       const fileId = req.params.fileId;

//       // 1️⃣ Get file metadata
//       const meta = await drive.files.get({
//         fileId,
//         fields: "name",
//       });

//       // 2️⃣ Set headers
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="${meta.data.name}"`
//       );

//       // 3️⃣ Stream file
//       const response = await drive.files.get(
//         { fileId, alt: "media" },
//         { responseType: "stream" }
//       );

//       response.data.pipe(res);
//     } catch (err) {
//       console.error("Download error:", err);
//       res.status(500).json({ error: "Download failed" });
//     }
//   });

//   return router;
// }

