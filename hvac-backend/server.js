// backend/server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import session from "express-session";
import passport from "passport";

// Import routes
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
import downloadRoutes from "./routes/download.js";
import createOAuthClient from "./google/oauthClient.js";
import generateAuthUrl from "./generateToken.js";
import handleGoogleTokenFlow from "./getRefreshToken.js";
import configurePassport from "./config/passport.js";

export function startServer(CONFIG) {
  if (!CONFIG) {
    throw new Error("CONFIG must be provided to startServer");
  }

  const port = CONFIG.BACKEND_PORT || 4000;
  const app = express();

  // =====================
  // Middleware
  // =====================
  app.use(
    session({
      secret: CONFIG.SESSION_SECRET || "fallback-secret",
      resave: false,
      saveUninitialized: false,
    })
  );

  const upload = multer({ dest: "uploads/" });

  app.use(
    cors({
      origin: CONFIG.FRONTEND_ORIGIN || "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configure passport with CONFIG
  configurePassport(CONFIG);

  app.use(passport.initialize());
  app.use(passport.session());

  // =====================
  // Google OAuth
  // =====================
  //const { oauth2Client, SCOPES } = oauthRoutes(CONFIG);
  const { oauth2Client, SCOPES } = createOAuthClient(CONFIG);
  // =====================
  // Other routes
  // =====================
  app.use("/auth", authRoutes(CONFIG));
  app.use("/upload", uploadRoutes);
  app.use("/download", downloadRoutes(CONFIG));

  // =====================
  // Google Sheets
  // =====================
  const GOOGLE_SHEET_URL =
    CONFIG.GOOGLE_SHEET_URL ||
    "https://script.google.com/macros/s/AKfycbxVcmNlmH14WpeWW1SMW3u0VQBT3TUYHI2w0x2XfbU_UlWPGxSGufsM351ldV4py4-d/exec";

  app.post("/sheet", async (req, res) => {
    try {
      const { rows } = req.body;

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: "rows array is required" });
      }

      const response = await axios.post(
        GOOGLE_SHEET_URL,
        { rows },
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
      );

      res.json(JSON.parse(response.data));
    } catch (err) {
      console.error("[backend] Sheet error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/sheet", async (req, res) => {
    try {
      const response = await axios.get(GOOGLE_SHEET_URL);
      res.json(JSON.parse(response.data));
    } catch (err) {
      console.error("[backend] Sheet fetch error:", err.message);
      res.status(500).json({ error: "Failed to fetch sheet data" });
    }
  });

  app.get("/generate-auth-url", (req, res) => {
    try {
      const url = generateAuthUrl(CONFIG);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/google-auth-url", (req, res) => {
    try {
      const { authUrl } = handleGoogleTokenFlow(CONFIG);
      res.json({ authUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/google-refresh-token", async (req, res) => {
    try {
      const code = req.query.code;
      const result = await handleGoogleTokenFlow(CONFIG, code);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =====================
  // Start server
  // =====================
  const server = app.listen(port, () => {
    console.log(`[backend] Server running on http://localhost:${port}`);
  });

  return server;
}
