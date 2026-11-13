// Bridge between the sign-in / notice window and the main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tracker", {
  login: (email, password) => ipcRenderer.invoke("auth:login", { email, password }),
  signOut: () => ipcRenderer.invoke("auth:signout"),
  getNotice: () => ipcRenderer.invoke("notice:get"),
  acceptNotice: () => ipcRenderer.invoke("notice:accept"),
  close: () => ipcRenderer.invoke("window:close"),
  onView: (callback) => ipcRenderer.on("view", (_event, payload) => callback(payload)),
});
