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