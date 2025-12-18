import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_LOW, INDENT_CONTENT_COMMAND, KEY_DOWN_COMMAND, OUTDENT_CONTENT_COMMAND } from "lexical";
import { useEffect } from "react";

export function ListPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          editor.dispatchCommand(event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND, undefined);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);
    return null;
}
