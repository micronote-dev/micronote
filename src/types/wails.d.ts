interface Window {
  go: {
    main: {
      App: {
        ReadJSON(filePath: string): Promise<unknown>;
        WriteJSON(filePath: string, data: unknown): Promise<void>;
        ExistsJSON(filePath: string): Promise<boolean>;
        InitJSON(filePath: string): Promise<void>;
        AppBoot(dirPath: string): Promise<FileTree[]>;
        GetWorkspacePath(): Promise<string>;
        SetWorkspacePath(path: string): Promise<void>;
        SelectFolder(): Promise<string>;
        ReadText(filePath: string): Promise<string>;
        MakeDir(dirPath: string): Promise<void>;
        WriteText(filePath: string, content: string): Promise<void>;
        ToggleFullscreen(): Promise<void>;
        RenameEntry(oldPath: string, newPath: string): Promise<void>;
        DeleteEntry(path: string): Promise<void>;
        DeleteIssue(path: string, position: number): Promise<void>;
        MoveEntry(src: string, dst: string): Promise<void>;
        ClipboardGetText(): Promise<string>;
        CopyEntry(src: string, dst: string): Promise<void>;
        GetConfig(): Promise<{ keybindings?: Record<string, string> }>;
        ListIssues(workspacePath: string): Promise<Issue[]>;
        ReadIssue(path: string, position: number): Promise<Issue>;
        CreateIssue(workspacePath: string, title: string): Promise<Issue>;
        UpdateIssueStatus(path: string, position: number, status: string): Promise<Issue>;
        UpdateIssueLimitDate(path: string, position: number, limitDate: string | null): Promise<Issue>;
        ToggleIssueSubissue(path: string, position: number, subissuePosition: number, completed: boolean): Promise<Issue>;
        UpdateIssue(path: string, position: number, update: IssueUpdate): Promise<Issue>;
      };
    };
  };
}

interface FileTree {
  type: string;
  name: string;
  path: string;
  children?: FileTree[];
}

interface Issue {
  path: string;
  position: number;
  title: string;
  status: "backlog" | "in_progress" | "done";
  limit_date: string | null;
  description: string;
  subissues: { title: string; completed: boolean }[];
  validation_errors: { field: string; message: string }[];
}

interface IssueUpdate {
  title: string;
  status: "backlog" | "in_progress" | "done";
  limit_date: string | null;
  description: string;
  subissues: { title: string; completed: boolean }[];
}
