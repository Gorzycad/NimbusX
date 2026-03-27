// electron/preload.js
//import { contextBridge, ipcRenderer } from "electron";
const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to renderer (React)
contextBridge.exposeInMainWorld("api", {
  
  // Example: send message to main process
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },

  // Example: receive message from main process
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }

});

contextBridge.exposeInMainWorld("electron", {
  openExternal: (url) => ipcRenderer.send("open-external", url),
  
  downloadFile: (fileId, token, fileName) =>
  ipcRenderer.invoke("download-file", { fileId, token, fileName }),

  onOAuthSuccess: (callback) => {
    ipcRenderer.removeAllListeners("oauth-success");
    ipcRenderer.on("oauth-success", (event, tokens) => callback(tokens));
  },
});