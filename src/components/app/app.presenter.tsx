import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TreeType } from "./components/app.constants";
import { DEFAULT_KEYBINDINGS, matchesKeybinding, type Keybindings } from "@/lib/keybindings";
import { api } from "@/lib/bridge";

type Props = {
  trees: TreeType[] | null;
  treeError: string | null;
  fetchTrees: () => Promise<void>;
  createFile: (path: string) => Promise<void>;
  makeDir: (path: string) => Promise<void>;
  renameEntry: (oldPath: string, newPath: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  moveEntry: (src: string, dst: string) => Promise<void>;
  copyEntry: (src: string, dst: string) => Promise<void>;
  toggleFullscreen: () => Promise<void>;
};

export const useAppPresenter = ({ trees, fetchTrees, createFile, makeDir, renameEntry, deleteEntry, moveEntry, copyEntry, toggleFullscreen }: Props) => {
  const navigate = useNavigate();
  const [isPathSelectDialogOpen, setIsPathSelectDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isVimMode, setIsVimMode] = useState(
    () => localStorage.getItem("vim-mode") === "true"
  );
  const [keybindings, setKeybindings] = useState<Keybindings>(DEFAULT_KEYBINDINGS);
  const [sidebarFocusRequest, setSidebarFocusRequest] = useState(0);
  const [sidebarCreateRequest, setSidebarCreateRequest] = useState(0);
  const [appError, setAppError] = useState<string | null>(null);

  const showError = useCallback((error: unknown) => {
    setAppError(error instanceof Error ? error.message : String(error));
  }, []);

  // Transient key state: only tracks whether Space is currently held between
  // keydown and keyup. A ref is appropriate here because this changes on every
  // keystroke and must be synchronously readable in the handler — useState
  // would cause unnecessary re-renders.
  const spaceHeldRef = useRef(false);
  // Timer that keeps spaceHeldRef true for a brief window after Space keyup so
  // sequential leader-key input (tap Space, release, then press E) works in
  // addition to the chord pattern (hold Space + press E).
  const spaceLeaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user config once on mount and merge with defaults.
  useEffect(() => {
    api.getConfig().then(({ keybindings: overrides }) => {
      if (!overrides) return;
      const validKeys = Object.keys(DEFAULT_KEYBINDINGS) as (keyof Keybindings)[];
      const merged = { ...DEFAULT_KEYBINDINGS };
      for (const key of validKeys) {
        if (overrides[key]) merged[key] = overrides[key];
      }
      setKeybindings(merged);
    }).catch(() => {});
  }, []);

  // Run on mount and whenever the path-select dialog closes. Skip when the
  // dialog opens to avoid an unnecessary fetch while the user is selecting.
  useEffect(() => {
    if (isPathSelectDialogOpen) return;
    fetchTrees();
  }, [isPathSelectDialogOpen, fetchTrees]);

  // The listener is recreated whenever sidebar state changes so the closure
  // always reads current values without needing stale-ref wrappers.
  useEffect(() => {
    // ── Space leader helpers ──────────────────────────────────────────────────
    const cancelSpaceLeaderTimer = () => {
      if (spaceLeaderTimerRef.current !== null) {
        clearTimeout(spaceLeaderTimerRef.current);
        spaceLeaderTimerRef.current = null;
      }
    };
    const clearSpaceLeader = () => {
      cancelSpaceLeaderTimer();
      spaceHeldRef.current = false;
    };

    // ── Focus context ─────────────────────────────────────────────────────────
    // Dispatch is driven by two orthogonal axes:
    //   - where the cursor is      (editor | form | app/tree)
    //   - what vim mode is active  (normal | editing | n/a)
    //
    //   "vim-normal"  editor focused + data-vim-mode="normal"
    //   "editing"     editor focused in insert/visual mode, or without vim
    //   "form"        input / textarea / select / dialog controls
    //   "app"         tree items, global (no text input owns the focus)
    type FocusCtx = "vim-normal" | "editing" | "form" | "app";

    const getFocusCtx = (target: EventTarget | null): FocusCtx => {
      if (!(target instanceof HTMLElement)) return "app";
      if (target.closest([
        "input", "textarea", "select",
        '[role="combobox"]', '[role="option"]',
        '[data-slot="popover-content"] button', '[role="dialog"] button',
      ].join(","))) return "form";
      const editorEl = target.closest(".milkdown-editor");
      if (editorEl) {
        return editorEl.querySelector('[data-vim-mode="normal"]') ? "vim-normal" : "editing";
      }
      return "app";
    };

    // ── Action registry ───────────────────────────────────────────────────────
    // App-level actions processed here. Tree-navigation actions are excluded;
    // the sidebar component handles them with its own keydown listener.
    type Action = keyof typeof DEFAULT_KEYBINDINGS;

    const APP_ACTIONS: Action[] = [
      "toggleSidebar", "toggleVimMode", "newFile", "toggleFullscreen",
      "openDirectory", "openSettings", "focusEditor", "closeFile",
    ];

    // In vim-normal mode: only these actions pass through; the Vim plugin owns
    // everything else (h/j/k/l, w/b/e, operators, …).
    const VIM_NORMAL_ACTIONS = new Set<Action>(["toggleSidebar", "toggleVimMode", "newFile"]);

    // In editing mode (insert/visual or plain contenteditable): only safe
    // Cmd-based actions are allowed; Space is a regular character here.
    const EDITING_ACTIONS = new Set<Action>(["newFile"]);

    const findAction = (e: KeyboardEvent, spaceHeld: boolean): Action | null => {
      for (const action of APP_ACTIONS) {
        if (matchesKeybinding(e, keybindings[action], spaceHeld)) return action;
      }
      return null;
    };

    const executeAction = (action: Action) => {
      switch (action) {
        case "toggleSidebar": {
          // Three-state toggle:
          //   closed               → open + focus tree
          //   open, tree unfocused → focus tree (keep open)
          //   open, tree focused   → close
          const treeHasFocus = !!(document.activeElement?.closest("[data-file-tree-item]"));
          if (isSidebarCollapsed || !treeHasFocus) {
            setIsSidebarCollapsed(false);
            setSidebarFocusRequest((r) => r + 1);
          } else {
            setIsSidebarCollapsed(true);
          }
          return;
        }
        case "toggleVimMode":
          setIsVimMode((prev) => {
            const next = !prev;
            localStorage.setItem("vim-mode", String(next));
            return next;
          });
          return;
        case "newFile":
          setIsSidebarCollapsed(false);
          setSidebarCreateRequest((request) => request + 1);
          return;
        case "toggleFullscreen":
          void toggleFullscreen();
          return;
        case "openDirectory":
          setIsPathSelectDialogOpen(true);
          return;
        case "openSettings":
          setIsSettingsOpen(true);
          return;
        case "focusEditor":
          (document.querySelector('[contenteditable="true"]') as HTMLElement | null)?.focus();
          return;
        case "closeFile":
          navigate("/");
          return;
      }
    };

    // ── keydown (capture phase) ───────────────────────────────────────────────
    // Only active in "vim-normal" context. Intercepts Space+key shortcuts before
    // the Vim plugin's target-phase handler claims the second key as a vim command.
    // Non-Space bindings (Cmd+N, etc.) are not intercepted here because vim ignores
    // modifier-key combos and does not need to be beaten to them.
    const captureSpaceShortcut = (e: KeyboardEvent) => {
      if (getFocusCtx(e.target) !== "vim-normal") return;

      if (e.key === " ") {
        if (!e.isComposing && !e.repeat) {
          cancelSpaceLeaderTimer();
          e.preventDefault();
          spaceHeldRef.current = true;
        }
        return;
      }

      if (!spaceHeldRef.current) return;

      // Do not gate on e.isComposing: on macOS WKWebView with Japanese IME in
      // romaji mode, the native layer sets isComposing=true for the second key
      // even in vim-normal (where JS compositionstart is blocked). Since
      // spaceHeldRef is only set when Space was pressed without composing,
      // the following key is always a shortcut, not IME input.
      const action = findAction(e, true);
      if (!action || !keybindings[action].includes("Space+")) return;

      e.preventDefault();
      e.stopPropagation();
      cancelSpaceLeaderTimer();
      spaceHeldRef.current = false;
      executeAction(action);
    };

    // ── keydown (bubble phase) ────────────────────────────────────────────────
    const down = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.repeat) return;

      const ctx = getFocusCtx(e.target);
      if (ctx === "form") return;

      if (e.key === " ") {
        switch (ctx) {
          case "editing":
            return;  // Space is a regular character; do not set leader
          case "vim-normal":
            // capture phase already set spaceHeldRef; confirm it here
            if (e.defaultPrevented) spaceHeldRef.current = true;
            return;
          case "app":
            e.preventDefault();
            spaceHeldRef.current = true;
            return;
        }
      }

      const action = findAction(e, spaceHeldRef.current);

      switch (ctx) {
        case "vim-normal":
          // The Vim plugin owns all other keys in normal mode
          if (!action || !VIM_NORMAL_ACTIONS.has(action)) { clearSpaceLeader(); return; }
          break;
        case "editing":
          // Only allow shortcuts that use a real modifier key (Cmd/Ctrl/Alt).
          // Bare-letter bindings (e.g. "A" for newFile) must not fire while the
          // user is typing — those only work when the tree has focus ("app" ctx).
          if (!action || !EDITING_ACTIONS.has(action)) return;
          if (!e.metaKey && !e.ctrlKey && !e.altKey) return;
          break;
        case "app":
          // All app shortcuts are available
          break;
      }

      if (action) {
        e.preventDefault();
        executeAction(action);
      }
    };

    // ── keyup ─────────────────────────────────────────────────────────────────
    const up = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      cancelSpaceLeaderTimer();
      // Keep spaceHeldRef true for 500 ms after Space release so that
      // leader-key input (tap Space → release → press E) works in addition
      // to the chord pattern (hold Space + press E simultaneously).
      spaceLeaderTimerRef.current = setTimeout(() => {
        spaceHeldRef.current = false;
        spaceLeaderTimerRef.current = null;
      }, 500);
    };

    document.addEventListener("keydown", captureSpaceShortcut, true);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", clearSpaceLeader);
    return () => {
      document.removeEventListener("keydown", captureSpaceShortcut, true);
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearSpaceLeader);
      cancelSpaceLeaderTimer();
    };
  }, [navigate, keybindings, isSidebarCollapsed, toggleFullscreen]);

  const handleCreateEntry = useCallback(async (parentPath: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (trimmed.endsWith("/")) {
        const dirName = trimmed.slice(0, -1).trim();
        if (dirName) await makeDir(`${parentPath}/${dirName}`);
      } else {
        const fileName = trimmed.includes(".") ? trimmed : `${trimmed}.md`;
        await createFile(`${parentPath}/${fileName}`);
      }
      await fetchTrees();
    } catch (e) {
      showError(e);
    }
  }, [createFile, makeDir, fetchTrees, showError]);

  const handleRenameEntry = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await renameEntry(oldPath, newPath);
      await fetchTrees();
    } catch (e) {
      showError(e);
    }
  }, [renameEntry, fetchTrees, showError]);

  const handleDeleteEntry = useCallback(async (path: string) => {
    try {
      await deleteEntry(path);
      await fetchTrees();
    } catch (e) {
      showError(e);
    }
  }, [deleteEntry, fetchTrees, showError]);

  const handleMoveEntry = useCallback(async (src: string, dst: string) => {
    try {
      await moveEntry(src, dst);
      await fetchTrees();
    } catch (e) {
      showError(e);
      throw e;
    }
  }, [moveEntry, fetchTrees, showError]);

  const handleCopyEntry = useCallback(async (src: string, dst: string) => {
    try {
      await copyEntry(src, dst);
      await fetchTrees();
    } catch (e) {
      showError(e);
      throw e;
    }
  }, [copyEntry, fetchTrees, showError]);

  const handleOpenFile = (id: string) => {
    navigate(`/${id}`);
  };

  const isStartScreen =
    !trees ||
    trees.length === 0 ||
    !trees.some((tree) => {
      const type = tree.type ?? (tree as TreeType & { Type?: string }).Type;
      return type === TreeType.DIR || type === TreeType.FILE;
    });

  return {
    handleCreateEntry,
    handleRenameEntry,
    handleDeleteEntry,
    handleMoveEntry,
    handleCopyEntry,
    isPathSelectDialogOpen,
    setIsPathSelectDialogOpen,
    isVimMode,
    isSettingsOpen,
    setIsSettingsOpen,
    isSearchOpen,
    setIsSearchOpen,
    handleOpenFile,
    isSidebarCollapsed,
    sidebarFocusRequest,
    sidebarCreateRequest,
    keybindings,
    isStartScreen,
    appError,
    dismissAppError: () => setAppError(null),
  };
};
