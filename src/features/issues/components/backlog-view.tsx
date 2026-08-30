import { AlertCircle, CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { Issue } from "../issues.types";
import { issueDisplayTitle } from "../issues.types";

type Props = {
  issues: Issue[];
  onOpen: (issue: Issue) => void;
};

const statusIcon = {
  backlog: Circle,
  in_progress: CircleDot,
  done: CheckCircle2,
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
};

export const BacklogView = ({ issues, onOpen }: Props) => (
  <div className="mx-auto w-full max-w-4xl px-8 pb-12">
    <div className="grid grid-cols-[1fr_9rem_7rem] border-b px-3 py-2 text-xs text-muted-foreground">
      <span>Title</span><span>Status</span><span className="text-right">Limit date</span>
    </div>
    {issues.length === 0 ? (
      <p className="px-3 py-10 text-center text-sm text-muted-foreground">No issues yet.</p>
    ) : issues.map((issue) => {
      const StatusIcon = statusIcon[issue.status];
      return (
        <button
          key={`${issue.path}:${issue.position}`}
          type="button"
          onClick={() => onOpen(issue)}
          className="grid w-full grid-cols-[1fr_9rem_7rem] items-center border-b px-3 py-3 text-left text-sm hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <StatusIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{issueDisplayTitle(issue)}</span>
            {issue.validation_errors.length > 0 && <AlertCircle className="size-4 shrink-0 text-destructive" aria-label="Invalid MTF" />}
          </span>
          <span className="text-xs capitalize text-muted-foreground">{issue.status.replace("_", " ")}</span>
          <span className="text-right text-xs text-muted-foreground">{formatDate(issue.limit_date)}</span>
        </button>
      );
    })}
  </div>
);
