import { useEffect, useRef } from "react";

type Props = {
  initialName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
};

export const InlineRenameInput = ({ initialName, onCommit, onCancel }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Select the name without the extension for files
    const dotIdx = initialName.lastIndexOf(".");
    const end = dotIdx > 0 ? dotIdx : initialName.length;
    input.setSelectionRange(0, end);
  }, [initialName]);

  const commit = () => {
    doneRef.current = true;
    const val = inputRef.current?.value.trim() ?? "";
    if (val) onCommit(val);
    else onCancel();
  };

  const cancel = () => {
    doneRef.current = true;
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialName}
      className="h-8 w-full rounded-md bg-sidebar-accent px-3 text-xs outline-none ring-1 ring-ring/40"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        else if (e.key === "Escape") { e.preventDefault(); cancel(); }
      }}
      onBlur={() => { if (!doneRef.current) cancel(); }}
    />
  );
};
