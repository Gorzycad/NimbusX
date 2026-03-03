import express from "express";
import multer from "multer";
import fs from "fs";
import { google } from "googleapis";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(req.session.googleTokens);

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    fs.unlinkSync(req.file.path);

    res.json({
      fileId: response.data.id,
      fileName: response.data.name,
      downloadLink: response.data.webViewLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
