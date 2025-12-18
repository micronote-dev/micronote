import { $convertToMarkdownString } from "@lexical/markdown";
import type { EditorState } from "lexical";
// import type { InitialEditorStateType } from "@lexical/react/LexicalComposer";
type Props = {
  path: string;
}

export const useWISIWYGFacade = ({ path }: Props) => {
  const handleChangeEditorContent = (editorState: EditorState) => {
    editorState.read(async () => {
      const md = $convertToMarkdownString();
      await window.api.writeText(path, md)
      console.log("Converted markdown:", md);
    })
  }
  return { handleChangeEditorContent };
};
