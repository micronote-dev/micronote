import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendingDelete } from "../sidebar.presenter";

type Props = {
  target: PendingDelete;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DeleteEntryDialog = ({ target, onConfirm, onCancel }: Props) => {
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!target) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "enter" || key === "y") {
        // Let Enter activate whichever dialog button the user tabbed to.
        if (key === "enter" && document.activeElement instanceof HTMLButtonElement) return;
        event.preventDefault();
        event.stopPropagation();
        onConfirm();
      } else if (key === "escape" || key === "n") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };

    // Capture the event before the editor, file tree, or WebView handles it.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [target, onConfirm, onCancel]);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          okButtonRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete {target?.type === "directory" ? "folder" : "file"}?</DialogTitle>
          <DialogDescription>
            “{target?.name}” will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} aria-keyshortcuts="Escape N">
            Cancel <span className="text-xs text-muted-foreground">Esc / N</span>
          </Button>
          <Button ref={okButtonRef} type="button" variant="destructive" onClick={onConfirm} aria-keyshortcuts="Enter Y">
            OK <span className="text-xs opacity-75">Enter / Y</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
