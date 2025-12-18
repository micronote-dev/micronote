// electron/preload.ts
import { contextBridge } from "electron";
import { ipcRenderer } from "electron";
export type ElectronAPI = {
  ping: () => string;
  readJSON: (filePath: string) => Promise<unknown>;
  writeJSON: (filePath: string, data: unknown) => Promise<void>;
  existsJSON: (filePath: string) => Promise<boolean>;
  initJSON: (filePath: string) => Promise<void>;
  appBoot: (dirPath: string) => Promise<unknown>;
  selectFolder: () => Promise<string | null>;
  readText: (filePath: string) => Promise<string>;
  writeText: (filePath: string, content: string) => Promise<boolean>;
};

const api = {
  ping: () => "pong from preload",
  readJSON: (filePath: string) => ipcRenderer.invoke("json:read", filePath),
  writeJSON: (filePath: string, data: unknown) => ipcRenderer.invoke("json:write", { filePath, data }),
  existsJSON: (filePath: string) => ipcRenderer.invoke("json:exists", filePath),
  initJSON: (filePath: string) => ipcRenderer.invoke("json:init", filePath),
  appBoot: (dirPath: string) => ipcRenderer.invoke("app:boot", dirPath),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  readText: (filePath: string) => ipcRenderer.invoke("file:readText", filePath) as Promise<string>,
  writeText: (filePath: string, content: string) =>
    ipcRenderer.invoke("file:writeText", { filePath, content }) as Promise<boolean>,
};

contextBridge.exposeInMainWorld("api", api);
// window.electronAPI の型補完用宣言

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
