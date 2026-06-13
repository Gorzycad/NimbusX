// hvac-backend/routes/upload.js
import admin from "firebase-admin";
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { google } from "googleapis";

export default function uploadRoute(CONFIG) {
  const router = express.Router();

  // ✅ Safe uploads folder inside user's home directory
  const uploadsDir = path.join(os.homedir(), "hvacapp_uploads");

  // Ensure the folder exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Multer storage config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });

  const upload = multer({ storage });

  router.post("/", upload.single("file"), async (req, res) => {
    try {
      const { uid } = req.body;

      if (!uid) {
        return res.status(400).json({ error: "Missing user id" });
      }

      console.log("UID RECEIVED:", req.body.uid);
      const userSnap = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .get();
      const userData = userSnap.data();

      console.log("USER EXISTS:", userSnap.exists);
      console.log("USER DATA:", userSnap.data());

      const refreshToken = userData?.googleRefreshToken;
      console.log("REFRESH TOKEN FOUND:", !!refreshToken);

      if (!refreshToken) {
        return res.status(403).json({ error: "Google Drive not connected" });
      }

      const oauth2Client = new google.auth.OAuth2(
        CONFIG.GOOGLE_CLIENT_ID,
        CONFIG.GOOGLE_CLIENT_SECRET,
        CONFIG.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const response = await drive.files.create({
        requestBody: {
          name: req.file.originalname,
        },
        media: {
          mimeType: req.file.mimetype,
          body: fs.createReadStream(req.file.path),
        },
      });

      // ✅ THIS WAS MISSING
      const fileId = response.data.id;

      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      fs.unlinkSync(req.file.path);

      return res.json({
        fileId: response.data.id,
        fileName: response.data.name,
      });

    } 
    //catch (err) {
    //   console.error("UPLOAD ERROR:", err.message);
    //   return res.status(500).json({ error: err.message });
    // }
    catch (err) {
    console.error("UPLOAD ROUTE ERROR:");
    console.error(err);
    console.error(err.response?.data);

    res.status(500).json({
      error: err.message,
      details: err.response?.data || null,
    });
  }
  });

  return router;
}
