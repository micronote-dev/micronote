import type { TreeType } from "../components/app.constants";
import { WISIWYGComponent } from "./components/wisiwyg/wisisyg.component";
import { useEditorFacade } from "./editor.facade";
type Props = {
    trees: TreeType[]
};
export const EditorContainer = ({ trees }: Props) => {
    const {initialContent, path} = useEditorFacade({ trees });
  return (
    <div className="p-2 px-4 flex flex-col w-full h-svh items-center">
      <div className="w-11/12 h-full relative pt-20 overflow-y-scroll hidden-scrollbar">
        <WISIWYGComponent content={initialContent} path={path || ""}/>
      </div>
    </div>
  );
};
