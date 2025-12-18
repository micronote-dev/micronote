import { setPath } from "@/models/path";
import { useState } from "react";




type Props = {
    onClose: () => void;    
};
export const useDirSelectDialogFacade = ({ onClose }: Props) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleSelectPath = async () => {
    const path = await window.api.selectFolder();
    setSelectedPath(path);
  };

  const handleSetNotePath = () => {
    if (!selectedPath) return;
    setPath(selectedPath);
    onClose()
  };

  return { selectedPath, handleSelectPath, handleSetNotePath };
};
