import { MilkdownEditorComponent } from "./components/milkdown/milkdown.component";
import { SourceEditorComponent } from "./components/source-editor.component";
import { useState } from "react";
import type { SaveStatus } from "./editor-save";
import { useVimModeIndicatorPresenter } from "../components/vim-mode-indicator/vim-mode-indicator.presenter";
import type { VimMode } from "./components/milkdown/milkdown-vim";

type Props = {
  initialContent: string;
  path: string;
  isVimMode?: boolean;
  sourceMode?: boolean;
  onReload?: () => Promise<void>;
  editorRevision?: number;
};

const forwardClickToEditor = (e: React.MouseEvent<HTMLDivElement>) => {
  const ce = e.currentTarget.querySelector<HTMLElement>('[contenteditable="true"]');
  if (ce && !ce.contains(e.target as Node)) ce.focus();
};

const MODE_LABEL: Record<VimMode, string> = {
  normal: "NORMAL", insert: "INSERT", visual: "VISUAL", "visual-line": "V-LINE",
};

export const EditorComponent = ({ initialContent, path, isVimMode, sourceMode, onReload = async () => {}, editorRevision = 0 }: Props) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { mode, command } = useVimModeIndicatorPresenter({ isVimMode: Boolean(isVimMode) });

  return (
  <div className="relative p-2 px-4 flex flex-col w-full h-full items-center">
    <div
      className="w-11/12 h-full relative pt-20 pb-8 overflow-y-scroll hidden-scrollbar"
      onClick={forwardClickToEditor}
    >
      {sourceMode ? (
        <SourceEditorComponent key={`${path}:${editorRevision}`} content={initialContent} path={path} onSaveStatus={setSaveStatus} />
      ) : (
        <MilkdownEditorComponent key={`${path}:${editorRevision}`} content={initialContent} path={path} isVimMode={isVimMode} onSaveStatus={setSaveStatus} />
      )}
    </div>
    <div className="absolute bottom-0 left-0 right-0 z-20 flex h-7 items-center border-t bg-background/95 px-3 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
      <span className="min-w-16 truncate text-foreground">{isVimMode && mode === "normal" ? command : ""}</span>
      <span className="flex-1 text-center">{isVimMode ? `-- ${MODE_LABEL[mode]} --` : ""}</span>
      <span className={saveStatus === "error" ? "text-destructive" : ""} aria-live="polite">
        {saveStatus === "saving" && "Saving…"}
        {saveStatus === "saved" && "Saved"}
        {saveStatus === "error" && "Save failed"}
      </span>
      <button type="button" className="ml-2 h-4 w-4 rounded text-[11px] leading-none hover:bg-muted" onClick={() => void onReload()} aria-label="Reload note" title="Reload note">↻</button>
    </div>
  </div>
  );
};
