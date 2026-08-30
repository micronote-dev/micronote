import { setPath } from "@/models/path";
import { api } from "@/lib/bridge";
import { useState } from "react";

type Props = {
    onClose: () => void;
};
export const useDirSelectDialogFacade = ({ onClose }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectPath = async () => {
    setError(null);
    setIsSelecting(true);
    try {
      const path = await api.selectFolder();
      if (!path) return;
      await setPath(path);
      onClose();
    } catch (selectionError) {
      setError(`Unable to save the selected folder: ${String(selectionError)}`);
    } finally {
      setIsSelecting(false);
    }
  };

  return { handleSelectPath, error, isSelecting };
};
