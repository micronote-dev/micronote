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
exports.readDirTrees = readDirTrees;
exports.bootApp = bootApp;
exports.getFullPath = getFullPath;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
function readDirTrees(dir) {
    const items = fs_1.default.readdirSync(dir);
    return items.map(item => {
        const fullPath = path.join(dir, item);
        const stat = fs_1.default.statSync(fullPath);
        if (stat.isDirectory()) {
            return {
                type: 'directory',
                name: item,
                path: fullPath,
                children: readDirTrees(fullPath)
            };
        }
        else {
            return {
                type: 'file',
                name: item,
                path: fullPath
            };
        }
    });
}
function bootApp(_, dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
    return readDirTrees(dirPath);
}
async function getFullPath() {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ["openDirectory"]
    });
    if (result.canceled)
        return null;
    return result.filePaths[0]; // ← これが絶対パス
}
