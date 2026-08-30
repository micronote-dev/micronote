import { EditorComponent } from "@/components/app/editor/editor.component";
import type { TreeType } from "@/components/app/components/app.constants";
import { api } from "@/lib/bridge";
import { searchPathById } from "@/utils/search";
import { AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import type { Issue } from "../issues.types";

type Props = {
  trees: TreeType[];
  issues: Issue[];
  isVimMode?: boolean;
  selectedId: string;
};

export const TextView = ({ trees, issues, isVimMode, selectedId }: Props) => {
  const path = useMemo(() => searchPathById(selectedId, trees), [selectedId, trees]);
  const issue = issues.find((candidate) => candidate.path === path);
  const { data: content, error, mutate } = useSWR(path, api.readText, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [editorRevision, setEditorRevision] = useState(0);
  const reload = async () => {
    if (!path) return;
    const freshContent = await api.readText(path);
    await mutate(freshContent, { revalidate: false });
    setEditorRevision((revision) => revision + 1);
  };

  if (!path) return <p className="p-8 text-sm text-muted-foreground">Issue file was not found.</p>;
  if (error) return <p className="p-8 text-sm text-destructive">{String(error)}</p>;
  if (content === undefined) return <div className="h-full" aria-busy="true" />;

  return (
    <div className="flex h-full flex-col">
      {issue && issue.validation_errors.length > 0 && (
        <div className="mx-auto mt-3 flex w-11/12 max-w-4xl gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <ul>
            {issue.validation_errors.map((validation, index) => (
              <li key={`${validation.field}-${index}`}>{validation.message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <EditorComponent initialContent={content} path={path} isVimMode={isVimMode} sourceMode onReload={reload} editorRevision={editorRevision} />
      </div>
    </div>
  );
};
