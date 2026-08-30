import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FolderOpenIcon } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectPath: () => void;
  error: string | null;
  isSelecting: boolean;
};

export const DirSelectDialogComponent = ({ isOpen, onClose, onSelectPath, error, isSelecting }: Props) => (
  <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent>
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Choose the folder where your notes are stored.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button onClick={onSelectPath} disabled={isSelecting}>
          <FolderOpenIcon className="mr-2 size-4" />
          {isSelecting ? "Selecting…" : "Choose folder"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
