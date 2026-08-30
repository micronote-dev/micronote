export interface Keybindings {
  toggleFullscreen: string;
  toggleSidebar: string;
  newFile: string;
  openDirectory: string;
  openSettings: string;
  toggleVimMode: string;
  focusEditor: string;
  closeFile: string;
  treeMoveLeft: string;
  treeMoveDown: string;
  treeMoveUp: string;
  treeMoveRight: string;
}

export const DEFAULT_KEYBINDINGS: Keybindings = {
  toggleFullscreen: "Cmd+Shift+F",
  toggleSidebar: "Space+E",
  newFile: "Cmd+N",
  openDirectory: "Cmd+O",
  openSettings: "Cmd+,",
  toggleVimMode: "Ctrl+Alt+V",
  focusEditor: "Cmd+E",
  closeFile: "Cmd+W",
  treeMoveLeft: "H",
  treeMoveDown: "J",
  treeMoveUp: "K",
  treeMoveRight: "L",
};

/** Normalizes e.key to a canonical key name (handles space, etc.). */
function normalizeKey(key: string): string {
  if (key === " ") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

/** Returns true when a KeyboardEvent matches a stored binding string. */
export function matchesKeybinding(e: KeyboardEvent, binding: string, spaceHeld = false): boolean {
  const parts = binding.split("+");
  const key = parts[parts.length - 1];
  const usesSpaceAsModifier = parts.includes("Space") && key !== "Space";
  const eventKey = e.key === " " ? "Space" : normalizeKey(e.key);
  return (
    eventKey === key &&
    (!usesSpaceAsModifier || spaceHeld) &&
    e.metaKey === parts.includes("Cmd") &&
    e.ctrlKey === parts.includes("Ctrl") &&
    e.altKey === parts.includes("Alt") &&
    e.shiftKey === parts.includes("Shift")
  );
}

/** Converts a binding string to a human-readable symbol sequence, e.g. "⌘⇧F". */
export function displayKeybinding(binding: string): string {
  const MAP: Record<string, string> = { Cmd: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Space: "Space" };
  const separator = binding.split("+").includes("Space") ? "+" : "";
  return binding
    .split("+")
    .map((p) => MAP[p] ?? p)
    .join(separator);
}
