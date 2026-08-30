import { useEffect, useState } from "react";
import { VIM_COMMAND_EVENT, VIM_MODE_EVENT, type VimMode } from "@/components/app/editor/components/milkdown/milkdown-vim";

export const useVimModeIndicatorPresenter = ({ isVimMode }: { isVimMode: boolean }) => {
  const [mode, setMode] = useState<VimMode>("normal");
  const [command, setCommand] = useState("");

  useEffect(() => {
    if (!isVimMode) return;
    const modeHandler = (e: Event) => setMode((e as CustomEvent<VimMode>).detail);
    const commandHandler = (e: Event) => setCommand((e as CustomEvent<string>).detail);
    document.addEventListener(VIM_MODE_EVENT, modeHandler);
    document.addEventListener(VIM_COMMAND_EVENT, commandHandler);
    return () => {
      document.removeEventListener(VIM_MODE_EVENT, modeHandler);
      document.removeEventListener(VIM_COMMAND_EVENT, commandHandler);
    };
  }, [isVimMode]);

  return {
    mode: isVimMode ? mode : "normal",
    command: isVimMode ? command : "",
  };
};
