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

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export const AppErrorDialog = ({ message, onDismiss }: Props) => {
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!message) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [message, onDismiss]);

  return (
    <Dialog open={message !== null} onOpenChange={(open) => { if (!open) onDismiss(); }}>
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
          <DialogTitle>Something went wrong</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap break-words">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button ref={okButtonRef} type="button" onClick={onDismiss} aria-keyshortcuts="Enter Escape">
            OK <span className="text-xs opacity-75">Enter / Esc</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
