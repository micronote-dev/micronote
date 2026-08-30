import { useCallback, useMemo, useRef, useState } from "react";
import { TreeType } from "../app.constants";
import { matchesKeybinding, type Keybindings } from "@/lib/keybindings";

export type InlineCreate = { parentId: string | null; parentPath: string } | null;
export type InlineRename = { path: string; name: string } | null;
export type PendingDelete = { path: string; name: string; type: "file" | "directory" } | null;

type Props = {
  trees: TreeType[];
  keybindings: Keybindings;
  onCreateEntry: (parentPath: string, name: string) => Promise<void>;
  onRenameEntry: (oldPath: string, newPath: string) => Promise<void>;
  onDeleteEntry: (path: string) => Promise<void>;
  onMoveEntry: (src: string, dst: string) => Promise<void>;
  onCopyEntry: (src: string, dst: string) => Promise<void>;
  onOpenFile: (file: TreeType) => void;
};

type ClipboardEntry = { mode: "cut" | "copy"; path: string; name: string } | null;

export const useSidebarPresenter = ({ trees, keybindings, onCreateEntry, onRenameEntry, onDeleteEntry, onMoveEntry, onCopyEntry, onOpenFile }: Props) => {
  const treeRef = useRef<HTMLDivElement>(null);
  const [inlineCreate, setInlineCreate] = useState<InlineCreate>(null);
  const [inlineRename, setInlineRename] = useState<InlineRename>(null);
  const [clipboard, setClipboard] = useState<ClipboardEntry>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const rootPath = useMemo(() => {
    if (!trees.length) return null;
    return trees[0].path;
  }, [trees]);

  const cookedTrees = useMemo(() => {
    const normalizeTree = (tree: TreeType): TreeType => {
      const source = tree as TreeType & {
        Type?: string;
        Name?: string;
        Path?: string;
        Children?: TreeType[];
      };
      const children = source.children ?? source.Children;
      return {
        ...source,
        type: source.type ?? source.Type ?? "",
        name: source.name ?? source.Name ?? "",
        path: source.path ?? source.Path ?? "",
        children: children
          ?.filter((c) => !(c.name ?? (c as { Name?: string }).Name ?? "").startsWith("."))
          .map(normalizeTree),
      };
    };

    const normalizedTrees = trees.map(normalizeTree);
    const dirs = normalizedTrees.filter((tree) => tree.type === TreeType.DIR);
    const files = normalizedTrees.filter((tree) => tree.type === TreeType.FILE);
    return [...dirs, ...files];
  }, [trees]);

  const markTreeCursor = (item: HTMLElement) => {
    treeRef.current?.querySelectorAll<HTMLElement>("[data-file-tree-item]").forEach((row) => {
      if (row !== item) row.removeAttribute("data-tree-cursor");
    });
    item.dataset.treeCursor = "true";
  };

  const commitCreate = async (name: string) => {
    if (!inlineCreate) return;
    setInlineCreate(null);
    await onCreateEntry(inlineCreate.parentPath, name);
  };

  const cancelCreate = () => setInlineCreate(null);

  const startInlineCreate = useCallback(() => {
    const focused = document.activeElement as HTMLElement | null;
    const item = focused?.closest<HTMLElement>("[data-file-tree-item]")
      ?? treeRef.current?.querySelector<HTMLElement>('[data-tree-cursor="true"]');
    const dirEl = item?.closest<HTMLElement>("[data-file-tree-directory]");
    const parentId = dirEl?.dataset.treeDirId;
    const parentPath = dirEl?.dataset.treeDirPath;
    if (parentId && parentPath) {
      setInlineCreate({ parentId, parentPath });
    } else if (rootPath) {
      setInlineCreate({ parentId: null, parentPath: rootPath });
    }
  }, [rootPath]);

  const commitRename = async (newName: string) => {
    if (!inlineRename) return;
    const trimmed = newName.trim().replace(/\//g, "");
    setInlineRename(null);
    if (!trimmed || trimmed === inlineRename.name) return;
    const dir = inlineRename.path.substring(0, inlineRename.path.lastIndexOf("/"));
    await onRenameEntry(inlineRename.path, `${dir}/${trimmed}`);
  };

  const cancelRename = () => setInlineRename(null);

  // Derive the focused item's path, name, type from DOM data attributes
  const getFocusedItem = () => {
    const focused = document.activeElement as HTMLElement;
    const item = focused?.closest<HTMLElement>("[data-file-tree-item]");
    if (!item) return null;
    const path = item.dataset.itemPath;
    const name = item.dataset.itemName;
    const type = item.dataset.itemType as "file" | "directory" | undefined;
    if (!path || !name) return null;
    return { path, name, type: type ?? "file", el: item };
  };

  // Derive the parent directory path of the focused item
  const getFocusedParentDir = () => {
    const focused = document.activeElement as HTMLElement;
    if (!focused?.closest("[data-file-tree-item]")) return rootPath;
    const dirEl = focused.closest<HTMLElement>("[data-file-tree-directory]");
    return dirEl?.dataset.treeDirPath ?? rootPath;
  };

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Don't intercept keys while any inline input is focused
    if (event.target instanceof HTMLInputElement) return;

    // ── File tree operations ───────────────────────────────────────────────
    if (event.key === "r") {
      event.preventDefault();
      event.stopPropagation();
      const item = getFocusedItem();
      if (item) setInlineRename({ path: item.path, name: item.name });
      return;
    }

    if (event.key === "d" || event.key === "Delete") {
      event.preventDefault();
      event.stopPropagation();
      const item = getFocusedItem();
      if (item) setPendingDelete({ path: item.path, name: item.name, type: item.type });
      return;
    }

    if (event.key === "x") {
      event.preventDefault();
      event.stopPropagation();
      const item = getFocusedItem();
      if (item) setClipboard({ mode: "cut", path: item.path, name: item.name });
      return;
    }

    if (event.key === "y") {
      event.preventDefault();
      event.stopPropagation();
      const item = getFocusedItem();
      if (item) setClipboard({ mode: "copy", path: item.path, name: item.name });
      return;
    }

    if (event.key === "p") {
      event.preventDefault();
      event.stopPropagation();
      if (!clipboard) return;
      const parentDir = getFocusedParentDir();
      if (!parentDir) return;
      const dst = `${parentDir}/${clipboard.name}`;
      if (clipboard.mode === "cut") {
        const saved = clipboard;
        void onMoveEntry(saved.path, dst)
          .then(() => setClipboard(null))
          .catch(() => {});
      } else {
        void onCopyEntry(clipboard.path, dst);
      }
      return;
    }

    // ── Inline create ──────────────────────────────────────────────────────
    if (event.key === "a") {
      event.preventDefault();
      event.stopPropagation();
      startInlineCreate();
      return;
    }

    // ── Navigation ─────────────────────────────────────────────────────────
    const items = Array.from(treeRef.current?.querySelectorAll<HTMLElement>("[data-file-tree-item]") ?? [])
      .filter((item) => item.getClientRects().length > 0 && !item.closest("[hidden]"));
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current < 0 || items.length === 0) return;

    const currentItem = items[current];
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      currentItem.click();
      return;
    }

    const isMoveDown = event.key === "ArrowDown" || matchesKeybinding(event.nativeEvent, keybindings.treeMoveDown);
    const isMoveUp = event.key === "ArrowUp" || matchesKeybinding(event.nativeEvent, keybindings.treeMoveUp);
    if (isMoveDown || isMoveUp) {
      event.preventDefault();
      event.stopPropagation();
      const next = isMoveDown
        ? Math.min(current + 1, items.length - 1)
        : Math.max(current - 1, 0);
      items[next]?.focus();
      return;
    }

    const currentDirectory = currentItem.closest<HTMLElement>("[data-file-tree-directory]");
    const isDirectoryButton = currentItem.dataset.fileTreeDirectoryButton === "true";
    const isMoveRight = event.key === "ArrowRight" || matchesKeybinding(event.nativeEvent, keybindings.treeMoveRight);
    if (isMoveRight && currentDirectory && isDirectoryButton) {
      event.preventDefault();
      event.stopPropagation();
      if (currentDirectory.dataset.state !== "open") {
        currentItem.click();
      } else {
        const firstChild = items[current + 1];
        firstChild?.focus();
      }
      return;
    }

    const isMoveLeft = event.key === "ArrowLeft" || matchesKeybinding(event.nativeEvent, keybindings.treeMoveLeft);
    if (isMoveLeft) {
      event.preventDefault();
      event.stopPropagation();
      if (currentDirectory && isDirectoryButton && currentDirectory.dataset.state === "open") {
        currentItem.click();
        return;
      }
      const parentDirectory = currentDirectory?.parentElement?.closest<HTMLElement>("[data-file-tree-directory]");
      parentDirectory?.querySelector<HTMLElement>("[data-file-tree-directory-button]")?.focus();
    }
  };

  const openFile = (file?: TreeType) => {
    if (!file?.id) return;
    onOpenFile(file);
    // The editor's own loading useEffect handles focus after the editor mounts.
  };

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    const { path } = pendingDelete;
    setPendingDelete(null);
    void onDeleteEntry(path);
  }, [onDeleteEntry, pendingDelete]);

  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  return { cookedTrees, treeRef, handleTreeKeyDown, openFile, markTreeCursor, startInlineCreate, inlineCreate, commitCreate, cancelCreate, inlineRename, commitRename, cancelRename, clipboard, pendingDelete, confirmDelete, cancelDelete };
};
