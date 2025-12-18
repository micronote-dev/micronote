"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// electron/main.ts
const electron_1 = require("electron");
const path = __importStar(require("path"));
const electron_2 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = require("./controllers/path");
const file_1 = require("./controllers/file");
const isDev = process.env.NODE_ENV === "development";
let mainWindow = null;
function createWindow() {
    console.log("preload path:", path.join(__dirname, "preload.js"));
    mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        alwaysOnTop: false, // 🔥 常に最前面
        frame: true, // ← これが重要
        titleBarStyle: 'default', // macOS の場合
        webPreferences: {
            preload: path.join(__dirname, "preload.js"), // dev では ts-node 経由なので後で解説
            devTools: true,
        },
    });
    mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
    });
    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }
    else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
// ---- ファイル書き込み（全体上書き）----
electron_2.ipcMain.handle("file:writeText", async (_event, payload) => {
    return await (0, file_1.writeTextFile)({ payload });
});
electron_2.ipcMain.handle("file:readText", async (_event, filePath) => {
    return await (0, file_1.readTextFile)(filePath);
});
electron_2.ipcMain.handle("select-folder", async () => {
    return await (0, path_1.getFullPath)();
});
electron_2.ipcMain.handle("app:boot", async (_e, dirPath) => {
    return (0, path_1.bootApp)(_e, dirPath);
});
electron_2.ipcMain.handle("json:init", async (_e, filePath) => {
    if (fs_1.default.existsSync(filePath))
        return;
    fs_1.default.writeFileSync(filePath, JSON.stringify({ projects: [], tasks: [] }, null, 2));
    return true;
});
electron_2.ipcMain.handle("json:read", async (_e, filePath) => {
    const text = fs_1.default.readFileSync(filePath, "utf-8");
    return JSON.parse(text);
});
electron_2.ipcMain.handle("json:write", async (_e, { filePath, data }) => {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
});
electron_2.ipcMain.handle("json:exists", async (_e, filePath) => {
    return fs_1.default.existsSync(filePath);
});
