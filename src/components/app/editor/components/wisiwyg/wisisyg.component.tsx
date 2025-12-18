import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { TRANSFORMERS } from "@lexical/markdown";
import { CODE } from "@lexical/markdown";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { initialConfig } from "./wisiwyg.config";
import { DefaultValuePlugin } from "./plugin/default-value";
import { useWISIWYGFacade } from "./wisiwyg.facade";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "./plugin/list";


const CUSTOM_TRANSFORMERS = TRANSFORMERS.filter((t) => t !== CODE);
type Props = {
  content: string;
  path: string;
};

export const WISIWYGComponent = ({ content, path }: Props) => {
    const {handleChangeEditorContent} = useWISIWYGFacade({ path });
  return (
    <LexicalComposer initialConfig={initialConfig()}>
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="min-h-[150px] outline-none"
              aria-placeholder={"Enter some text..."}
              placeholder={<div className="absolute top-0 text-gray-500">Enter some text...</div>}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <OnChangePlugin onChange={handleChangeEditorContent} />
      <DefaultValuePlugin content={content} />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <ListPlugin/>
      <MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
    </LexicalComposer>
  );
};
