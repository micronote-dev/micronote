import type { Issue } from "@/features/issues/issues.types";

export const api = {
  readJSON: (filePath: string): Promise<unknown> =>
    window.go.main.App.ReadJSON(filePath),
  writeJSON: (filePath: string, data: unknown): Promise<void> =>
    window.go.main.App.WriteJSON(filePath, data),
  existsJSON: (filePath: string): Promise<boolean> =>
    window.go.main.App.ExistsJSON(filePath),
  initJSON: (filePath: string): Promise<void> =>
    window.go.main.App.InitJSON(filePath),
  appBoot: (dirPath: string): Promise<unknown> =>
    window.go.main.App.AppBoot(dirPath),
  getWorkspacePath: (): Promise<string> =>
    window.go.main.App.GetWorkspacePath(),
  setWorkspacePath: (path: string): Promise<void> =>
    window.go.main.App.SetWorkspacePath(path),
  selectFolder: (): Promise<string> =>
    window.go.main.App.SelectFolder(),
  readText: (filePath: string): Promise<string> =>
    window.go.main.App.ReadText(filePath),
  writeText: (filePath: string, content: string): Promise<void> =>
    window.go.main.App.WriteText(filePath, content),
  makeDir: (dirPath: string): Promise<void> =>
    window.go.main.App.MakeDir(dirPath),
  toggleFullscreen: (): Promise<void> =>
    window.go.main.App.ToggleFullscreen(),
  renameEntry: (oldPath: string, newPath: string): Promise<void> =>
    window.go.main.App.RenameEntry(oldPath, newPath),
  deleteEntry: (path: string): Promise<void> =>
    window.go.main.App.DeleteEntry(path),
  deleteIssue: (path: string, position: number): Promise<void> =>
    window.go.main.App.DeleteIssue(path, position),
  moveEntry: (src: string, dst: string): Promise<void> =>
    window.go.main.App.MoveEntry(src, dst),
  clipboardGetText: (): Promise<string> =>
    window.go.main.App.ClipboardGetText(),
  copyEntry: (src: string, dst: string): Promise<void> =>
    window.go.main.App.CopyEntry(src, dst),
  getConfig: (): Promise<{ keybindings?: Record<string, string> }> =>
    window.go.main.App.GetConfig(),
  listIssues: (workspacePath: string): Promise<Issue[]> =>
    window.go.main.App.ListIssues(workspacePath),
  readIssue: (path: string, position: number): Promise<Issue> =>
    window.go.main.App.ReadIssue(path, position),
  createIssue: (workspacePath: string, title: string): Promise<Issue> =>
    window.go.main.App.CreateIssue(workspacePath, title),
  updateIssueStatus: (path: string, position: number, status: string): Promise<Issue> =>
    window.go.main.App.UpdateIssueStatus(path, position, status),
  updateIssueLimitDate: (path: string, position: number, limitDate: string | null): Promise<Issue> =>
    window.go.main.App.UpdateIssueLimitDate(path, position, limitDate),
  toggleIssueSubissue: (path: string, position: number, subissuePosition: number, completed: boolean): Promise<Issue> =>
    window.go.main.App.ToggleIssueSubissue(path, position, subissuePosition, completed),
  updateIssue: (path: string, position: number, update: Omit<Issue, "path" | "position" | "validation_errors">): Promise<Issue> =>
    window.go.main.App.UpdateIssue(path, position, update),
};
