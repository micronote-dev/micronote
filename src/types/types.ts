
export type ElectronAPI = {
  ping: () => string;
  readJSON: (filePath: string) => Promise<{path: string}>;
  writeJSON: (filePath: string, data: unknown) => Promise<void>;
  existsJSON: (filePath: string) => Promise<boolean>;
  initJSON: (filePath: string) => Promise<void>;
  appBoot: (dirPath: string) => Promise<unknown>;
  selectFolder: () => Promise<string | null>;
  readText: (filePath: string) => Promise<string>;
  writeText: (filePath: string, content: string) => Promise<boolean>;
};

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
