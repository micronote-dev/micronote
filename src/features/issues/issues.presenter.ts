import { useState } from "react";
import type { IssueStatus } from "./issues.types";
import type { Issue } from "./issues.types";

type Props = {
  createIssue: (title: string) => Promise<void>;
  updateStatus: (path: string, position: number, status: IssueStatus) => Promise<void>;
};

export const useIssuesPresenter = ({ createIssue, updateStatus }: Props) => {
  const [isCreating, setIsCreating] = useState(false);
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);

  const handleCreate = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await createIssue(trimmed);
      setIsCreating(false);
    } catch {
      // The facade exposes the operation error in the issue view.
    }
  };

  const handleDrop = async (status: IssueStatus) => {
    const issue = draggedIssue;
    setDraggedIssue(null);
    if (!issue) return;
    try {
      await updateStatus(issue.path, issue.position, status);
    } catch {
      // The card never moved optimistically; the facade renders the error.
    }
  };

  return {
    isCreating,
    setIsCreating,
    draggedIssue,
    setDraggedIssue,
    handleCreate,
    handleDrop,
  };
};
