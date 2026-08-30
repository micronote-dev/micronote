import { Milkdown, MilkdownProvider } from "@milkdown/react";
import { useEffect } from "react";
import { useMilkdownPresenter } from "./milkdown.presenter";
import type { SaveStatus } from "../../editor-save";

type Props = {
  content: string;
  path: string;
  isVimMode?: boolean;
  onSaveStatus?: (status: SaveStatus) => void;
};

const MilkdownEditor = ({ onSaveStatus, ...editorProps }: Props) => {
  const { loading, saveStatus } = useMilkdownPresenter(editorProps);
  useEffect(() => { onSaveStatus?.(saveStatus); }, [onSaveStatus, saveStatus]);
  return (
    <>
      <div className="milkdown-editor min-h-[150px] outline-none" aria-busy={loading}>
        <Milkdown />
      </div>
    </>
  );
};

export const MilkdownEditorComponent = (props: Props) => (
  <MilkdownProvider>
    <MilkdownEditor {...props} />
  </MilkdownProvider>
);
