import type { TreeType } from "../components/app.constants";
import { useEditorFacade } from "./editor.facade";
import { EditorComponent } from "./editor.component";
import { useState } from "react";

type Props = {
  trees: TreeType[];
  isVimMode?: boolean;
};

export const EditorContainer = ({ trees, isVimMode }: Props) => {
  const { initialContent, path, reload } = useEditorFacade({ trees });
  const [editorRevision, setEditorRevision] = useState(0);
  if (!path || initialContent === undefined) return <div className="h-svh w-full" />;
  const handleReload = async () => {
    await reload();
    setEditorRevision((revision) => revision + 1);
  };
  return <EditorComponent initialContent={initialContent} path={path} isVimMode={isVimMode} onReload={handleReload} editorRevision={editorRevision} />;
};
