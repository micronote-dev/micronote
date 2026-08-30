import { useEffect, useRef } from "react";

type Props = {
  onCommit: (name: string) => void;
  onCancel: () => void;
};

export const InlineCreateInput = ({ onCommit, onCancel }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      className="h-8 w-full rounded-md bg-sidebar-accent px-3 text-xs outline-none ring-1 ring-ring/40 placeholder:text-muted-foreground/60"
      placeholder="name or name/ for dir"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        else if (e.key === "Escape") { e.preventDefault(); cancel(); }
      }}
      onBlur={() => { if (!doneRef.current) cancel(); }}
    />
  );
};
