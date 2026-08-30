import { AlertCircle } from "lucide-react";
import type { Issue, IssueStatus } from "../issues.types";
import { issueDisplayTitle } from "../issues.types";

type Props = {
  issues: Issue[];
  draggedIssue: Issue | null;
  onDrag: (issue: Issue | null) => void;
  onDrop: (status: IssueStatus) => Promise<void>;
  onOpen: (issue: Issue) => void;
};

const columns: { status: IssueStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

export const KanbanView = ({ issues, draggedIssue, onDrag, onDrop, onOpen }: Props) => (
  <div className="grid h-[calc(100svh-8rem)] grid-cols-3 gap-4 overflow-x-auto px-6 pb-6">
    {columns.map((column) => {
      const columnIssues = issues.filter((issue) => issue.status === column.status);
      return (
        <section
          key={column.status}
          className="min-w-56 rounded-lg bg-muted/45 p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); void onDrop(column.status); }}
        >
          <header className="mb-3 flex items-center justify-between px-1 text-xs font-medium">
            <span>{column.label}</span>
            <span className="text-muted-foreground">{columnIssues.length}</span>
          </header>
          <div className="space-y-2">
            {columnIssues.map((issue) => {
              const complete = issue.subissues.filter((subissue) => subissue.completed).length;
              return (
                <button
                  key={`${issue.path}:${issue.position}`}
                  type="button"
                  draggable
                  onDragStart={() => onDrag(issue)}
                  onDragEnd={() => onDrag(null)}
                  onClick={() => onOpen(issue)}
                  className={`block w-full rounded-md border bg-background p-3 text-left shadow-sm hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${draggedIssue?.position === issue.position ? "opacity-50" : ""}`}
                >
                  <span className="flex items-start gap-2 text-sm">
                    <span className="flex-1">{issueDisplayTitle(issue)}</span>
                    {issue.validation_errors.length > 0 && <AlertCircle className="size-4 shrink-0 text-destructive" />}
                  </span>
                  <span className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>{issue.limit_date ?? "No limit"}</span>
                    {issue.subissues.length > 0 && <span>{complete} / {issue.subissues.length}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      );
    })}
  </div>
);
