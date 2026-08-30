import { useState } from "react";
import type { TreeType } from "@/components/app/components/app.constants";

function collectFiles(trees: TreeType[]): TreeType[] {
  const files: TreeType[] = [];
  for (const tree of trees) {
    if (tree.type === "file") files.push(tree);
    if (tree.children) files.push(...collectFiles(tree.children));
  }
  return files;
}

type Props = {
  trees: TreeType[];
  onSelect: (id: string) => void;
  onOpenChange: (open: boolean) => void;
};

export const useSearchDialogPresenter = ({ trees, onSelect, onOpenChange }: Props) => {
  const [query, setQuery] = useState("");

  const files = collectFiles(trees).filter(
    (f) => query === "" || f.name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    onOpenChange(false);
    setQuery("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setQuery("");
    onOpenChange(open);
  };

  return { query, setQuery, files, handleSelect, handleOpenChange };
};
