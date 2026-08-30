export const ISSUE_FILE_SUFFIX = ".mtf.md";

export type IssueStatus = "backlog" | "in_progress" | "done";

export type IssueValidation = {
  field: string;
  message: string;
};

export type Subissue = {
  title: string;
  completed: boolean;
};

export type Issue = {
  path: string;
  position: number;
  title: string;
  status: IssueStatus;
  limit_date: string | null;
  description: string;
  subissues: Subissue[];
  validation_errors: IssueValidation[];
};

export const isIssueFile = (name: string) =>
  name.toLowerCase().endsWith(ISSUE_FILE_SUFFIX);

export const issueDisplayTitle = (issue: Issue) => {
  if (issue.title) return issue.title;
  const fileName = issue.path.split("/").pop() ?? issue.path;
  return fileName.slice(0, -ISSUE_FILE_SUFFIX.length) || "Untitled issue";
};
