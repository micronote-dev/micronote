import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { AutoLinkNode } from "@lexical/link";
import { ParagraphNode, TextNode} from "lexical";
// import { CustomCodeBlockNode } from "./components/plugin/codeblock";



export const initialConfig = () => ({
    namespace: "MyEditor",
    theme: {
      paragraph: "mb-2 text-lg",
      heading: {
        h1: "text-4xl font-bold my-6　border-b mb-8",
        h2: "text-2xl font-semibold my-4",
        h3: "text-xl font-semibold my-2",
      },
      link: "text-blue-600 underline",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        code: "bg-gray-200 border border-gray-300 rounded px-1",
      },
      code: "font-mono p-2 bg-gray-100 block border border-gray-300 rounded text-md",
      list: {
        ul: "list-disc mb-4",
        ulDepth: ['pl-6', 'pl-10', 'pl-14'],
        ol: "list-decimal mb-4",
        listitem: "mb-1",
        nested: {
          listitem: "mb-1 list-none",
        },
        checklist: "list-none pl-6 mb-4 mb-1 relative flex items-center mr-2",
      },
      codeHighlight: {
        atrule: "text-red-600", // red
        attr: "text-purple-600", // purple
        boolean: "text-blue-600", // blue
        builtin: "text-blue-600", // blue
        cdata: "text-gray-500", // gray
        char: "text-blue-800", // dark blue
        class: "text-purple-600", // purple
        "class-name": "text-purple-600",
        comment: "text-gray-500", // gray
        constant: "text-blue-600", // blue
        deleted: "text-red-600", // red
        doctype: "text-gray-500", // gray
        entity: "text-green-600", // green
        function: "text-purple-600", // purple
        important: "text-orange-600", // orange
        inserted: "text-green-600", // green
        keyword: "text-red-600", // red
        namespace: "text-orange-600", // orange
        number: "text-blue-600", // blue
        operator: "text-red-600", // red
        prolog: "text-gray-500", // gray
        property: "text-blue-600", // blue
        punctuation: "text-gray-900", // dark/black
        regex: "text-blue-800", // dark blue
        selector: "text-purple-600", // purple
        string: "text-blue-800", // dark blue
        symbol: "text-blue-600", // blue
        tag: "text-green-600", // green
        url: "text-blue-800", // dark blue
        variable: "text-orange-600", // orange
      },
    },
    onError: ( ) => {},
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      ParagraphNode,
      TextNode,
      CodeHighlightNode,
      CodeNode,
    ],
  });