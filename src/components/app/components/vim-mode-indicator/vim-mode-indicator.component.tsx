import type { VimMode } from "@/components/app/editor/components/milkdown/milkdown-vim";
import { useVimModeIndicatorPresenter } from "./vim-mode-indicator.presenter";

const MODE_LABEL: Record<VimMode, string> = {
  normal: "NORMAL",
  insert: "INSERT",
  visual: "VISUAL",
  "visual-line": "V-LINE",
};

type Props = { isVimMode: boolean };

export const VimModeIndicator = ({ isVimMode }: Props) => {
  const { mode, command } = useVimModeIndicatorPresenter({ isVimMode });
  if (!isVimMode) return null;
  return (
    <>
      {mode === "normal" && command && (
        <div
          aria-live="polite"
          className="absolute bottom-3 left-4 select-none pointer-events-none font-mono text-xs text-foreground"
        >
          {command}
        </div>
      )}
      <div className="absolute bottom-3 right-4 select-none pointer-events-none font-mono text-xs text-muted-foreground">
        -- {MODE_LABEL[mode]} --
      </div>
    </>
  );
};
