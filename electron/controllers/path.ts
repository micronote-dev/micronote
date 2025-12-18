import { dialog } from "electron";
import fs from "fs";
import * as path from "path";

export function readDirTrees(dir: string): unknown{
  const items = fs.readdirSync(dir);
  return items.map(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return {
        type: 'directory',
        name: item,
        path: fullPath,
        children: readDirTrees(fullPath)
      };
    } else {
      return {
        type: 'file',
        name: item,
        path: fullPath
      };
    }
  });
}

export function bootApp(_:unknown, dirPath:string){
  if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return readDirTrees(dirPath);
}

export async function getFullPath() {
const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (result.canceled) return null;
  return result.filePaths[0]; // ← これが絶対パス
}