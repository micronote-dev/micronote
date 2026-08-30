import { useEffect, useRef, useState } from "react";
import { saveMarkdown, type SaveStatus } from "../editor-save";

type Props = {
  content: string;
  path: string;
  onSaveStatus?: (status: SaveStatus) => void;
};

const SAVE_DELAY_MS = 250;

export const SourceEditorComponent = ({ content, path, onSaveStatus }: Props) => {
  const [value, setValue] = useState(content);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => { onSaveStatus?.(saveStatus); }, [onSaveStatus, saveStatus]);

  const queueSave = (markdown: string) => {
    setSaveStatus("saving");
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(() => saveMarkdown(path, markdown))
      .then(() => {
        setSaveError(null);
        setSaveStatus("saved");
      })
      .catch((error: unknown) => {
        setSaveError(String(error));
        setSaveStatus("error");
      });
  };

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    if (pendingRef.current !== null) queueSave(pendingRef.current);
  // The editor is keyed by path, so this cleanup intentionally captures one file.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      {saveError && <p role="alert" className="mb-2 text-xs text-destructive">Failed to save: {saveError}</p>}
      <p className={`fixed bottom-4 right-5 text-xs ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
        {saveStatus === "saving" && "Saving…"}
        {saveStatus === "saved" && "Saved"}
        {saveStatus === "error" && "Save failed"}
      </p>
      <textarea
        autoFocus
        aria-label="Issue Markdown"
        spellCheck={false}
        value={value}
        onChange={(event) => {
          const markdown = event.target.value;
          setValue(markdown);
          setSaveError(null);
          pendingRef.current = markdown;
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            pendingRef.current = null;
            queueSave(markdown);
          }, SAVE_DELAY_MS);
        }}
        className="h-full w-full resize-none bg-transparent font-mono text-sm leading-7 outline-none"
      />
    </div>
  );
};
