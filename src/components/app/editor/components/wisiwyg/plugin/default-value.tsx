import { $convertFromMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

type Props = {
  content?: string;
};

export const DefaultValuePlugin = ({ content }: Props) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(content || "");
    });
  }, [content, editor]);
  return null;
};
