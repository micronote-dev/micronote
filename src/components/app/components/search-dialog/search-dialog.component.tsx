import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CircleDot, FileIcon } from "lucide-react";
import type { TreeType } from "@/components/app/components/app.constants";
import { useSearchDialogPresenter } from "./search-dialog.presenter";
import { isIssueFile } from "@/features/issues/issues.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trees: TreeType[];
  onSelect: (id: string) => void;
};

export function SearchDialogComponent({ open, onOpenChange, trees, onSelect }: Props) {
  const { query, setQuery, files, handleSelect, handleOpenChange } = useSearchDialogPresenter({ trees, onSelect, onOpenChange });

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search notes"
      description="Search notes by filename"
    >
      <CommandInput
        placeholder="Search notes..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No notes found.</CommandEmpty>
        {files.map((file) => (
          <CommandItem
            key={file.id}
            value={file.name}
            onSelect={() => { if (file.id) handleSelect(file.id); }}
          >
            {isIssueFile(file.name) ? <CircleDot className="mr-2 size-4" /> : <FileIcon className="mr-2 size-4" />}
            {file.name}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
