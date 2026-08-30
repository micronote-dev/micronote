import { useEffect, useRef } from "react";

type Props = {
  onCreate: (title: string) => Promise<void>;
  onCancel: () => void;
};

export const IssueCreate = ({ onCreate, onCancel }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async () => {
    const title = inputRef.current?.value.trim() ?? "";
    if (!title || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await onCreate(title);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <input
      ref={inputRef}
      aria-label="Issue title"
      placeholder="Issue title"
      className="h-8 w-64 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); void submit(); }
        if (event.key === "Escape") { event.preventDefault(); onCancel(); }
      }}
    />
  );
};
