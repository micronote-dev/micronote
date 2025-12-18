"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/preload.ts
const electron_1 = require("electron");
const electron_2 = require("electron");
const api = {
    ping: () => "pong from preload",
    readJSON: (filePath) => electron_2.ipcRenderer.invoke("json:read", filePath),
    writeJSON: (filePath, data) => electron_2.ipcRenderer.invoke("json:write", { filePath, data }),
    existsJSON: (filePath) => electron_2.ipcRenderer.invoke("json:exists", filePath),
    initJSON: (filePath) => electron_2.ipcRenderer.invoke("json:init", filePath),
    appBoot: (dirPath) => electron_2.ipcRenderer.invoke("app:boot", dirPath),
    selectFolder: () => electron_2.ipcRenderer.invoke("select-folder"),
    readText: (filePath) => electron_2.ipcRenderer.invoke("file:readText", filePath),
    writeText: (filePath, content) => electron_2.ipcRenderer.invoke("file:writeText", { filePath, content }),
};
electron_1.contextBridge.exposeInMainWorld("api", api);
