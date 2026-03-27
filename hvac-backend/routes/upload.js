// hvac-backend/routes/upload.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { google } from "googleapis";

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

// Upload endpoint
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // ✅ Get token from headers instead of session
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.split(" ")[1]; // access_token
    console.log("RECEIVED TOKEN:", token);
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.create({
      requestBody: { name: req.file.originalname },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    // Remove local file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      fileId: response.data.id,
      fileName: response.data.name,
      //downloadLink: response.data.webViewLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import { google } from "googleapis";

// const router = express.Router();
// const upload = multer({ dest: "uploads/" });

// router.post("/", upload.single("file"), async (req, res) => {
//   try {
//     // ✅ Get token from headers instead of session
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Not authenticated" });
//     }

//     const token = authHeader.split(" ")[1]; // access_token

//     const oauth2Client = new google.auth.OAuth2();
//     oauth2Client.setCredentials({ access_token: token });

//     const drive = google.drive({ version: "v3", auth: oauth2Client });

//     const response = await drive.files.create({
//       requestBody: { name: req.file.originalname },
//       media: {
//         mimeType: req.file.mimetype,
//         body: fs.createReadStream(req.file.path),
//       },
//       fields: "id, name, webViewLink, webContentLink",
//     });

//     fs.unlinkSync(req.file.path);

//     res.json({
//       fileId: response.data.id,
//       fileName: response.data.name,
//       downloadLink: response.data.webViewLink,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;

// // hvac-backend/routes/upload.js
// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import os from "os";
// import { google } from "googleapis";

// const router = express.Router();

// // Safe uploads folder inside user's home directory
// const uploadsDir = path.join(os.homedir(), "hvacapp_uploads");

// // Ensure the folder exists
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// // Multer storage config
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadsDir),
//   filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
// });

// const upload = multer({ storage });

// router.post("/", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.session.googleTokens) {
//       return res.status(401).json({ error: "Not authenticated" });
//     }

//     const oauth2Client = new google.auth.OAuth2();
//     oauth2Client.setCredentials(req.session.googleTokens);

//     const drive = google.drive({ version: "v3", auth: oauth2Client });

//     const response = await drive.files.create({
//       requestBody: {
//         name: req.file.originalname,
//       },
//       media: {
//         mimeType: req.file.mimetype,
//         body: fs.createReadStream(req.file.path),
//       },
//       fields: "id, name, webViewLink, webContentLink",
//     });

//     // Remove local file after upload
//     fs.unlinkSync(req.file.path);

//     res.json({
//       fileId: response.data.id,
//       fileName: response.data.name,
//       downloadLink: response.data.webViewLink,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;

// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import { google } from "googleapis";

// const router = express.Router();
// const upload = multer({ dest: "uploads/" });

// router.post("/", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.session.googleTokens) {
//       return res.status(401).json({ error: "Not authenticated" });
//     }

//     const oauth2Client = new google.auth.OAuth2();
//     oauth2Client.setCredentials(req.session.googleTokens);

//     const drive = google.drive({ version: "v3", auth: oauth2Client });

//     const response = await drive.files.create({
//       requestBody: {
//         name: req.file.originalname,
//       },
//       media: {
//         mimeType: req.file.mimetype,
//         body: fs.createReadStream(req.file.path),
//       },
//       fields: "id, name, webViewLink, webContentLink",
//     });

//     fs.unlinkSync(req.file.path);

//     res.json({
//       fileId: response.data.id,
//       fileName: response.data.name,
//       downloadLink: response.data.webViewLink,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;
