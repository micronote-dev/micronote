import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_KEYBINDINGS, displayKeybinding } from "@/lib/keybindings";
import { useSettingsDialogPresenter } from "./settings-dialog.presenter";

const VIM_MODE_KEYS: { label: string; keys: string }[] = [
  { label: "Enter insert mode", keys: "i" },
  { label: "Enter visual mode", keys: "v / V" },
  { label: "Return to normal mode", keys: "Esc  ·  Ctrl+C" },
];

const APP_SHORTCUT_ROWS: { label: string; binding: string }[] = [
  { label: "Show / hide sidebar", binding: DEFAULT_KEYBINDINGS.toggleSidebar },
  { label: "New file", binding: DEFAULT_KEYBINDINGS.newFile },
  { label: "Open folder", binding: DEFAULT_KEYBINDINGS.openDirectory },
  { label: "Open settings", binding: DEFAULT_KEYBINDINGS.openSettings },
  { label: "Focus editor", binding: DEFAULT_KEYBINDINGS.focusEditor },
  { label: "Close file", binding: DEFAULT_KEYBINDINGS.closeFile },
  { label: "Toggle full screen", binding: DEFAULT_KEYBINDINGS.toggleFullscreen },
  { label: "Enable / disable vim mode", binding: DEFAULT_KEYBINDINGS.toggleVimMode },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const SettingsDialog = ({ isOpen, onClose }: Props) => {
  const { handleOpenChange } = useSettingsDialogPresenter({ onClose });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cheat Sheet</DialogTitle>
        </DialogHeader>
        <div className="mt-1 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <p className="mb-1 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              App
            </p>
            <div className="space-y-0.5">
              {APP_SHORTCUT_ROWS.map(({ label, binding }) => (
                <InfoRow key={label} label={label} keys={displayKeybinding(binding)} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              File tree (when tree is focused)
            </p>
            <div className="space-y-0.5">
              <InfoRow label="Move up / down" keys="k / j" />
              <InfoRow label="Expand / collapse" keys="l / h" />
              <InfoRow label="Open file" keys="Enter" />
              <InfoRow label="New file" keys="a" />
              <InfoRow label="Rename" keys="r" />
              <InfoRow label="Delete" keys="d" />
            </div>
          </div>

          <div>
            <p className="mb-1 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Vim Mode
            </p>
            <div className="space-y-0.5">
              {VIM_MODE_KEYS.map(({ label, keys }) => (
                <InfoRow key={label} label={label} keys={keys} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ label, keys }: { label: string; keys: string }) => (
  <div className="flex items-center justify-between rounded px-2 py-1.5 text-muted-foreground">
    <span className="text-sm">{label}</span>
    <span className="rounded border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
      {keys}
    </span>
  </div>
);
