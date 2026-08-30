import { useDirSelectDialogFacade } from "./dir-select-dialog.facade";
import { DirSelectDialogComponent } from "./dir-select-dialog.component";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const DirSelectDialogContainer = ({ isOpen, onClose }: Props) => {
  const { handleSelectPath, error, isSelecting } = useDirSelectDialogFacade({ onClose });
  return <DirSelectDialogComponent isOpen={isOpen} onClose={onClose} onSelectPath={handleSelectPath} error={error} isSelecting={isSelecting} />;
};
