// electron/main.js
import admin from "firebase-admin";
import fs from "fs";
import os from "os";
import path from "path";
import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from "electron";
import { fileURLToPath } from "url";
import { startServer } from "../hvac-backend/server.js";
import log from "electron-log";
import pkg from "electron-updater";
import axios from "axios";
import { google } from "googleapis";
import fetch from "node-fetch";
import handleGoogleTokenFlow from "../hvac-backend/getRefreshToken.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(import.meta.url);
const serviceAccountPath = path.join(
  __dirname,
  "../hvac-backend/serviceAccountKey.json"
);
console.log("Service Account Path:", serviceAccountPath);

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const appPkg = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

console.log("App version:", appPkg.version);

const { autoUpdater } = pkg;

// --- Protocol registration (keep this) ---
if (process.platform === "win32") {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient("hvacapp", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient("hvacapp");
  }
} else {
  app.setAsDefaultProtocolClient("hvacapp");
}

// --- Global variable to store protocol URL on cold start ---
let protocolUrl = null;

// --- Catch protocol URLs on Windows cold start ---
if (process.platform === "win32") {
  const arg = process.argv.find((a) => a.includes("hvacapp://"));
  if (arg) protocolUrl = arg;
}

async function handleOAuthCode(code) {
  try {
    const result = await handleGoogleTokenFlow(CONFIG, code);

    if (!result.refreshToken) {
      throw new Error("No refresh token returned from Google");
    }

    // Send ONLY refresh token (not full tokens)
    if (mainWindow) {
      mainWindow.webContents.send("oauth-success", {
        refreshToken: result.refreshToken,
      });
    }

  } catch (err) {
    console.error("OAuth token exchange failed:", err);
  }
}

// --- Mac open-url handler ---
app.on("open-url", (event, url) => {
  event.preventDefault();

  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }

  const urlObj = new URL(url);
  const code = urlObj.searchParams.get("code");

  if (code) {
    handleOAuthCode(code);
  }
});

// --- Single instance lock (Windows running multiple times) ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {

    const url = argv.find((a) => a.startsWith("hvacapp://"));
    console.log("SECOND INSTANCE ARGV:", argv);

    if (mainWindow) {

      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.show();
      mainWindow.focus();
    }
    console.log("FOUND PROTOCOL URL:", url);

    if (url) {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get("code");

      console.log("OAUTH CODE:", code);
      if (code) {
        handleOAuthCode(code);
      }
    }

  });

}

let CONFIG;

function loadConfig() {
  try {
    let configPath;

    if (app.isPackaged) {
      // ✅ Production (installed app)
      configPath = path.join(process.resourcesPath, "config.json");
    } else {
      // ✅ Development
      configPath = path.join(__dirname, "../config/config.json");
    }

    console.log("📁 Loading config from:", configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`config.json not found at ${configPath}`);
    }

    const raw = fs.readFileSync(configPath, "utf8");
    CONFIG = JSON.parse(raw);

    console.log("✅ CONFIG loaded successfully");
    console.log("CLIENT ID:", CONFIG.GOOGLE_CLIENT_ID);
    console.log("CLIENT SECRET:", CONFIG.GOOGLE_CLIENT_SECRET);
    console.log("CLIENT REDIRECT URI:", CONFIG.GOOGLE_REDIRECT_URI);

  } catch (err) {
    console.error("❌ Failed to load config:", err);
    app.quit();
  }
}

// --- Create window & start backend ---
app.whenReady().then(() => {
  try {
    loadConfig(); // ✅ LOAD CONFIG FIRST

    if (!CONFIG) {
      throw new Error("CONFIG not loaded before starting backend");
    }
    backendServer = startServer(CONFIG);
    createWindow();

    // --- Send protocol URL to renderer if exists ---
    if (protocolUrl) {
      const urlObj = new URL(protocolUrl);
      const code = urlObj.searchParams.get("code");

      if (code) {
        handleOAuthCode(code);
      }
    }

    // Only check for updates in production
    if (!isDev) {
      autoUpdater.logger = log;
      autoUpdater.logger.transports.file.level = "info";
      setTimeout(() => autoUpdater.checkForUpdates(), 5000);
      setInterval(() => autoUpdater.checkForUpdates(), 600000);
    }

  } catch (err) {
    console.error("Backend failed to start:", err);
  }
});

const isDev = !app.isPackaged;

let mainWindow;
let backendServer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "NimbusX",
    icon: path.join(__dirname, "assets/icons/vault.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev // DevTools only allowed in development
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "../hvac-app/build/index.html");
    console.log("Loading:", indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Disable right-click context menu
  mainWindow.webContents.on("context-menu", (e) => {
    e.preventDefault();
  });

  // Block DevTools shortcuts & unwanted keys
  mainWindow.webContents.on("before-input-event", (event, input) => {

    const ctrl = input.control || input.meta;

    // Allow only copy, cut, paste
    if (ctrl && ["c", "x", "v"].includes(input.key.toLowerCase())) {
      return;
    }

    // Block DevTools shortcuts
    if (
      input.key === "F12" ||
      (ctrl && input.shift && input.key.toLowerCase() === "i") ||
      (ctrl && input.shift && input.key.toLowerCase() === "j") ||
      (ctrl && input.key.toLowerCase() === "u")
    ) {
      event.preventDefault();
    }
  });

  // Prevent DevTools from opening even if triggered
  mainWindow.webContents.on("devtools-opened", () => {
    if (!isDev) {
      mainWindow.webContents.closeDevTools();
    }
  });
}

ipcMain.on("open-google-login", () => {
  shell.openExternal(
    "http://localhost:4000/auth/google?redirect=http://localhost:3000/CompanyDashboard/leads"
  );
});

ipcMain.on("open-external", (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("download-file", async (event, { fileId, token, fileName }) => {
  try {
    const response = await axios.get(
      `http://localhost:4000/download/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "arraybuffer",
      }
    );

    const savePath = await dialog.showSaveDialog({
      title: "Save File",
      defaultPath: fileName, // ✅ keeps original extension
    });

    if (savePath.canceled) return;

    fs.writeFileSync(savePath.filePath, response.data);

    return { success: true };

  } catch (error) {
    console.error("Download failed:", error);
    return { success: false };
  }
});

ipcMain.handle("get-company-logo", async (event, { fileId, companyId, userId }) => {
  try {
    // 🔥 1. GET USER DOC (NOT COMPANY)
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(userId)
      .get();

    const refreshToken = userDoc.data()?.googleRefreshToken;

    if (!refreshToken) {
      throw new Error("No refresh token found for user");
    }

    // 🔥 2. OAuth client
    const oauth2Client = new google.auth.OAuth2(
      CONFIG.GOOGLE_CLIENT_ID,
      CONFIG.GOOGLE_CLIENT_SECRET,
      CONFIG.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // 🔥 3. Get access token
    const { token } = await oauth2Client.getAccessToken();

    if (!token) {
      throw new Error("Failed to generate access token");
    }

    // 🔥 4. Fetch image from Drive
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch file from Drive");
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      success: true,
      url: `data:image/png;base64,${base64}`,
    };

  } catch (err) {
    console.error("get-company-logo error:", err);
    return { success: false };
  }
});

ipcMain.handle("get-drive-image",
  async (event, { fileId, refreshToken }) => {
    try {
      console.log("FILE ID:", fileId);

      const oauth2Client =
        new google.auth.OAuth2(
          CONFIG.GOOGLE_CLIENT_ID,
          CONFIG.GOOGLE_CLIENT_SECRET,
          CONFIG.GOOGLE_REDIRECT_URI
        );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { token } =
        await oauth2Client.getAccessToken();

      console.log(
        "ACCESS TOKEN GENERATED:",
        !!token
      );

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "GOOGLE STATUS:",
        response.status
      );

      if (!response.ok) {
        const text =
          await response.text();

        console.log(
          "GOOGLE ERROR:",
          text
        );

        return {
          success: false,
          error: text,
        };
      }

      const buffer =
        await response.arrayBuffer();

      console.log(
        "IMAGE SIZE:",
        buffer.byteLength
      );

      return {
        success: true,
        url:
          "data:image/png;base64," +
          Buffer.from(buffer).toString(
            "base64"
          ),
      };
    } catch (err) {
      console.error(
        "GET DRIVE IMAGE ERROR:",
        err
      );

      return {
        success: false,
        error: err.message,
      };
    }
  }
);

ipcMain.handle("get-drive-file", async (event, { fileId, refreshToken }) => {
  try {
    if (!fileId || !refreshToken) {
      throw new Error("Missing fileId or refreshToken");
    }

    const oauth2Client = new google.auth.OAuth2(
      CONFIG.GOOGLE_CLIENT_ID,
      CONFIG.GOOGLE_CLIENT_SECRET,
      CONFIG.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { token } = await oauth2Client.getAccessToken();

    if (!token) {
      throw new Error("Failed to get access token");
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const buffer = await response.arrayBuffer();

    return {
      success: true,
      fileId,
      url: `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`,
    };

  } catch (err) {
    console.error("Drive IPC error:", err);

    return {
      success: false,
      error: err.message,
    };
  }
});

autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox({
    type: "info",
    title: "Update Ready",
    message: "A new update has been downloaded. Restart to apply.",
    buttons: ["Restart"]
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  autoUpdater.downloadUpdate();
  console.log("Update available:", info.version);
});

autoUpdater.on("update-not-available", () => {
  console.log("No updates available.");
});

autoUpdater.on("error", (err) => {
  console.error("Updater error:", err);
});

app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) {
      e.preventDefault();
    }
  });
});

// Gracefully close backend on exit
app.on("window-all-closed", () => {
  if (backendServer) backendServer.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});


//To update my app, from project root terminal, type each code line by line and press enter each time. wait to finish
// git add .
// git commit -m "Release v1.0.0"  ( dont type this -----adjust this line version)
// git tag v1.0.0 ( dont type this -----adjust this line version)
// git push origin main --tags

//after typing the above 4 lines, run npm run dist to upload

