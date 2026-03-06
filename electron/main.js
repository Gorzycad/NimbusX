// electron/main.js
import fs from "fs";
import os from "os";
import path from "path";
import { app, BrowserWindow, Menu, dialog } from "electron";
import { fileURLToPath } from "url";
import { startServer } from "../hvac-backend/server.js";
import pkg from "electron-updater";
const { autoUpdater } = pkg;

const secretsPath = path.join(
  os.homedir(),
  "nimbusxsecrets",
  "config.json"
);

if (!fs.existsSync(secretsPath)) {
  throw new Error(`Missing config file at ${secretsPath}`);
}

const CONFIG = JSON.parse(fs.readFileSync(secretsPath, "utf8"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

console.log("CLIENT ID:", CONFIG.GOOGLE_CLIENT_ID);
console.log("CLIENT SECRET:", CONFIG.GOOGLE_CLIENT_SECRET);
console.log("CLIENT REDIRECT URI:", CONFIG.GOOGLE_REDIRECT_URI);


let mainWindow;
let backendServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "NimbusX", // ✅ Window title
    icon: path.join(__dirname, "assets/icons/vault.png"), // PNG exported from Lucide
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
}

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

// Start backend first, then frontend
app.whenReady().then(() => {
  try {
    backendServer = startServer(CONFIG);
    createWindow();

    // Only check for updates in production
    if (!isDev) {
      // Enable updater logging
      autoUpdater.logger = console;
      autoUpdater.logger.transports.file.level = "info";
      autoUpdater.checkForUpdatesAndNotify();
    }
  } catch (err) {
    console.error("Backend failed to start:", err);
  }

});

// Gracefully close backend on exit
app.on("window-all-closed", () => {
  if (backendServer) backendServer.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// Export CONFIG so other Electron modules can import it
//export { CONFIG };
// Pass CONFIG into backend when starting server
//export default CONFIG;

//To update my app, from project root terminal, type each code line by line and press enter each time. wait to finish
// git add .
// git commit -m "Release v1.0.0"  ( dont type this -----adjust this line version)
// git tag v1.0.0 ( dont type this -----adjust this line version)
// git push origin main --tags

//after typing the above 4 lines, run npm run dist to upload

