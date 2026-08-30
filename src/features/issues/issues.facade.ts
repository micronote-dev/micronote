import { api } from "@/lib/bridge";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import type { Issue, IssueStatus } from "./issues.types";
import { isIssueFile } from "./issues.types";

type Props = {
  boardPath: string | null;
};

export const useIssuesFacade = ({ boardPath }: Props) => {
  const [operationError, setOperationError] = useState<string | null>(null);
  const { data: issues = [], error: loadError, isLoading, mutate } = useSWR<Issue[]>(
    boardPath ? `micro-note:issues:${boardPath}` : null,
    () => api.listIssues(boardPath!),
    { revalidateOnFocus: true },
  );

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    const handleFileSaved = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (path && isIssueFile(path)) void refresh();
    };
    window.addEventListener("micro-note:file-saved", handleFileSaved);
    return () => window.removeEventListener("micro-note:file-saved", handleFileSaved);
  }, [refresh]);

  const run = useCallback(async (operation: () => Promise<unknown>) => {
    setOperationError(null);
    try {
      await operation();
      await mutate();
    } catch (error) {
      setOperationError(String(error));
      throw error;
    }
  }, [mutate]);

  const createIssue = useCallback(async (title: string) => {
    if (!boardPath) throw new Error("Select a task board first");
    await run(() => api.createIssue(boardPath, title));
  }, [boardPath, run]);

  const updateStatus = useCallback(
    (path: string, position: number, status: IssueStatus) => run(() => api.updateIssueStatus(path, position, status)),
    [run],
  );

  const updateLimitDate = useCallback(
    (path: string, position: number, limitDate: string | null) => run(() => api.updateIssueLimitDate(path, position, limitDate)),
    [run],
  );

  const toggleSubissue = useCallback(
    (path: string, position: number, subissuePosition: number, completed: boolean) => run(() => api.toggleIssueSubissue(path, position, subissuePosition, completed)),
    [run],
  );

  return {
    issues,
    boardPath,
    isLoading,
    error: operationError ?? (loadError ? String(loadError) : null),
    createIssue,
    updateStatus,
    updateLimitDate,
    toggleSubissue,
    refresh,
  };
};
