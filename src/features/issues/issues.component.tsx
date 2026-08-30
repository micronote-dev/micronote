import type { TreeType } from "@/components/app/components/app.constants";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Navigate, NavLink, Route, Routes, useParams } from "react-router-dom";
import { BacklogView } from "./components/backlog-view";
import { IssueCreate } from "./components/issue-create";
import { KanbanView } from "./components/kanban-view";
import { TextView } from "./components/text-view";
import { useIssuesPresenter } from "./issues.presenter";
import type { Issue, IssueStatus } from "./issues.types";
import { IssueDialog } from "./components/issue-dialog.component";
import { useState } from "react";

type Props = {
  trees: TreeType[];
  issues: Issue[];
  boardPath: string | null;
  isLoading: boolean;
  error: string | null;
  isVimMode?: boolean;
  createIssue: (title: string) => Promise<void>;
  updateStatus: (path: string, position: number, status: IssueStatus) => Promise<void>;
};

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-xs transition-colors ${isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`;

export const IssuesComponent = ({ trees, issues, boardPath, isLoading, error, isVimMode, createIssue, updateStatus }: Props) => {
  const { selectedId } = useParams<{ selectedId: string }>();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const presenter = useIssuesPresenter({ createIssue, updateStatus });
  const sortedIssues = [...issues].sort((left, right) => left.title.localeCompare(right.title));
  const openIssue = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  if (!selectedId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex h-20 shrink-0 items-end gap-6 px-8 pb-3 pt-8">
        <h1 className="mr-2 text-lg font-semibold">Issues</h1>
        <nav className="flex items-center gap-1" aria-label="Issue views">
          <NavLink to={`/issues/${selectedId}/backlog`} className={tabClass}>Backlog</NavLink>
          <NavLink to={`/issues/${selectedId}/kanban`} className={tabClass}>Kanban</NavLink>
          <NavLink to={`/issues/${selectedId}/text`} className={tabClass}>Text</NavLink>
        </nav>
        <div className="ml-auto">
          {presenter.isCreating ? (
            <IssueCreate onCreate={presenter.handleCreate} onCancel={() => presenter.setIsCreating(false)} />
          ) : (
            <Button size="sm" variant="ghost" disabled={!boardPath} onClick={() => presenter.setIsCreating(true)}>
              <Plus className="size-4" /> New issue
            </Button>
          )}
        </div>
      </header>
      {error && <p role="alert" className="mx-8 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      {!boardPath ? (
        <p className="p-8 text-sm text-muted-foreground">Select a task board to manage issues.</p>
      ) : isLoading ? (
        <div className="p-8 text-sm text-muted-foreground" aria-busy="true">Loading issues…</div>
      ) : (
        <main className="min-h-0 flex-1">
          <Routes>
            <Route index element={<Navigate to="backlog" replace />} />
            <Route path="backlog" element={<BacklogView issues={sortedIssues} onOpen={openIssue} />} />
            <Route path="kanban" element={<KanbanView issues={sortedIssues} draggedIssue={presenter.draggedIssue} onDrag={presenter.setDraggedIssue} onDrop={presenter.handleDrop} onOpen={openIssue} />} />
            <Route path="text" element={<TextView trees={trees} issues={issues} isVimMode={isVimMode} selectedId={selectedId} />} />
          </Routes>
        </main>
      )}
      <IssueDialog issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </div>
  );
};
