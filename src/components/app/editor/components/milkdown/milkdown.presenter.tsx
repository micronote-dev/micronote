import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useEditor } from "@milkdown/react";
import { Editor, defaultValueCtx, editorViewCtx, parserCtx, rootCtx, serializerCtx, prosePluginsCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { Plugin } from "@milkdown/kit/prose/state";
import { Slice } from "@milkdown/kit/prose/model";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorView } from "@milkdown/kit/prose/view";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { createMilkdownVimPlugin } from "./milkdown-vim";
import { saveMarkdown, type SaveStatus } from "../../editor-save";
import { api } from "@/lib/bridge";

type Props = {
  content: string;
  path: string;
  isVimMode?: boolean;
};

const splitTableRow = (line: string) => {
  let row = line.trim();
  if (row.startsWith("\\|")) row = `|${row.slice(2)}`;
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|").replace(/\\`/g, "`"));
};

const isTableDivider = (line: string) =>
  splitTableRow(line).length > 0 && splitTableRow(line).every((cell) => /^:?-{1,}:?$/.test(cell.replace(/[—–−]/g, "-")));

/** Normalize escaped table markers emitted by tools that escape Markdown punctuation. */
const normalizeMarkdownTables = (markdown: string) => {
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\\?\|/.test(lines[i] ?? "") || !isTableDivider(lines[i + 1] ?? "")) continue;
    let end = i;
    while (end < lines.length && (/^\s*\\?\|/.test(lines[end] ?? "") || (lines[end] ?? "").trim() === "")) end++;
    for (let row = i; row < end; row++) {
      lines[row] = (lines[row] ?? "").replace(/^(\s*)\\\|/, "$1|").replace(/\\`/g, "`").replace(/[—–−]/g, "-");
    }
    i = end - 1;
  }
  return lines.join("\n");
};

/** Recover common Markdown block boundaries when a clipboard provider has
 * collapsed all newlines into spaces. This is intentionally conservative. */
const restoreCollapsedMarkdown = (markdown: string) => {
  if (/\r?\n/.test(markdown)) return markdown;
  return markdown
    .replace(/\s+(?=#{1,6}\s)/g, "\n\n")
    .replace(/\s+(?=>\s)/g, "\n\n")
    .replace(/\s+(?=\d+\.\s)/g, "\n")
    .replace(/\|\s+(?=\|)/g, "|\n");
};

const insertParsedBlocks = (view: EditorView, parsed: ProseNode) => {
  if (!parsed.content.size) return false;
  // Use a fully-closed slice (openStart=0, openEnd=0) so each block is inserted
  // as a complete node. replaceSelection splits the current paragraph at the
  // cursor and places the blocks between the two halves.
  view.dispatch(view.state.tr.replaceSelection(Slice.maxOpen(parsed.content)).scrollIntoView());
  return true;
};

// parse is nullable: null until the editor is initialized and sets the ref.
const applyMarkdownPaste = (
  view: EditorView,
  parse: ((markdown: string) => ProseNode) | null,
  rawText: string,
  hasHtml: boolean,
): boolean => {
  if (!parse || !rawText.trim()) return false;
  const normalized = normalizeMarkdownTables(restoreCollapsedMarkdown(rawText.replace(/\r\n?/g, "\n")));
  const looksLikeMarkdown = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|```|>\s)/.test(normalized)
    || /\*{1,2}[^\n*]+\*{1,2}|_{1,2}[^\n_]+_{1,2}|`[^`\n]+`|\[[^\]]+\]\([^)]+\)/.test(normalized)
    || normalized.split(/\r?\n/).some((line, index, lines) => /^\s*\|/.test(line) && isTableDivider(lines[index + 1] ?? ""));
  if (hasHtml && !looksLikeMarkdown) return false;
  const markdownToInsert = looksLikeMarkdown ? normalized : normalized.replace(/\n(?!\n)/g, "\n\n");
  const parsed = parse(markdownToInsert);
  if (!parsed.content.size) return false;
  insertParsedBlocks(view, parsed);
  return true;
};

// parseRef is set after editor initialization so it can call parse within editor.action().
const createMarkdownPastePlugin = (parseRef: MutableRefObject<((markdown: string) => ProseNode) | null>) => {
  let pasteHandledAt = 0;

  return new Plugin({
    // WKWebView fires beforeinput(insertFromPaste) even after paste.preventDefault(),
    // which causes ProseMirror's DOMObserver to pick up the raw native text insertion
    // and overwrite whatever handlePaste just inserted. Capture beforeinput first to
    // stop the native insertion from reaching the DOM.
    view(editorView) {
      const onBeforeInput = (event: Event) => {
        if ((event as InputEvent).inputType !== "insertFromPaste") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (Date.now() - pasteHandledAt < 200) {
          pasteHandledAt = 0;
          return;
        }
        void api.clipboardGetText().then((nativeText) => {
          if (nativeText.trim()) applyMarkdownPaste(editorView, parseRef.current, nativeText, false);
        }).catch(() => {});
      };
      editorView.dom.addEventListener("beforeinput", onBeforeInput, true);
      return { destroy() { editorView.dom.removeEventListener("beforeinput", onBeforeInput, true); } };
    },
    props: {
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        let text = clipboard?.getData("text/plain") ?? "";
        const hasHtml = clipboard?.types.includes("text/html") ?? false;

        if (hasHtml && !text.trim()) {
          const html = clipboard!.getData("text/html");
          if (html) {
            const container = document.createElement("div");
            container.innerHTML = html;
            const blockNodes = Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,pre,blockquote,li,div,section,article,tr"));
            const recovered = blockNodes.length > 0
              ? blockNodes.map((node) => (node as HTMLElement).innerText || node.textContent || "").join("\n\n")
              : container.innerText || container.textContent || "";
            if (recovered.trim()) text = recovered;
          }
        }

        if (text.trim()) {
          pasteHandledAt = Date.now();
          return applyMarkdownPaste(view, parseRef.current, text, hasHtml);
        }

        return true;
      },
    },
  });
};

const createPlainTablePastePlugin = () => new Plugin({
  props: {
    handlePaste: (view, event) => {
      const text = event.clipboardData?.getData("text/plain") ?? "";
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2 || !isTableDivider(lines[1] ?? "")) return false;
      if (!view.state.selection.empty || view.state.selection.$from.parent.content.size !== 0) return false;

      const header = splitTableRow(lines[0] ?? "");
      const divider = splitTableRow(lines[1] ?? "");
      const rows = lines.slice(2).map(splitTableRow);
      const columns = Math.max(header.length, ...rows.map((row) => row.length));
      if (columns === 0 || divider.length !== header.length) return false;

      const { schema } = view.state;
      const table = schema.nodes.table;
      const headerRow = schema.nodes.table_header_row;
      const headerCell = schema.nodes.table_header;
      const row = schema.nodes.table_row;
      const cell = schema.nodes.table_cell;
      const paragraph = schema.nodes.paragraph;
      if (!table || !headerRow || !headerCell || !row || !cell || !paragraph) return false;
      const alignment = (value: string) => value.startsWith(":") && value.endsWith(":") ? "center" : value.endsWith(":") ? "right" : value.startsWith(":") ? "left" : null;
      const makeCell = (type: typeof cell, value: string, align: string | null) =>
        type.create({ alignment: align }, paragraph.create(null, value ? schema.text(value) : null));
      const makeHeader = (value: string, align: string | null) =>
        headerCell.create({ alignment: align }, paragraph.create(null, value ? schema.text(value) : null));
      const fill = (values: string[]) => [...values, ...Array(Math.max(0, columns - values.length)).fill("")].slice(0, columns);
      const headerNodes = fill(header).map((value, index) => makeHeader(value, alignment(divider[index] ?? "")));
      const rowNodes = rows.map((values) => row.create(null, fill(values).map((value, index) => makeCell(cell, value, alignment(divider[index] ?? "")))));
      const tableNode = table.create(null, [headerRow.create(null, headerNodes), ...rowNodes]);
      view.dispatch(view.state.tr.replaceSelectionWith(tableNode).scrollIntoView());
      return true;
    },
  },
});

export const useMilkdownPresenter = ({ content, path, isVimMode = false }: Props) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const mountedRef = useRef(true);
  const latestRevisionRef = useRef(0);
  const lastQueuedMarkdownRef = useRef<string | null>(content);
  // Set to a parse wrapper after the editor is initialized. Calling parserCtx directly
  // from an event handler throws MilkdownError("out of scope"); editor.action() provides
  // the required context scope.
  const parseRef = useRef<((markdown: string) => ProseNode) | null>(null);

  const queueSave = useCallback((markdown: string, reportStatus = true) => {
    if (markdown === lastQueuedMarkdownRef.current) return;
    lastQueuedMarkdownRef.current = markdown;
    const revision = ++latestRevisionRef.current;
    if (reportStatus && mountedRef.current) setSaveStatus("saving");
    void saveMarkdown(path, markdown)
      .then(() => {
        if (reportStatus && mountedRef.current && revision === latestRevisionRef.current) {
          setSaveStatus("saved");
        }
      })
      .catch((error: unknown) => {
        if (revision === latestRevisionRef.current) lastQueuedMarkdownRef.current = null;
        if (reportStatus && mountedRef.current && revision === latestRevisionRef.current) {
          setSaveStatus("error");
        }
        console.error("Failed to save note", error);
      });
  }, [path]);

  const { loading, get } = useEditor(
    (root) => {
      let active = true;
      const currentMarkdown = (ctx: Ctx) => {
        const view = ctx.get(editorViewCtx);
        return ctx.get(serializerCtx)(view.state.doc);
      };

      return Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, normalizeMarkdownTables(content));
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .config((ctx) => {
          ctx.update(prosePluginsCtx, (plugins) => [createMarkdownPastePlugin(parseRef), createPlainTablePastePlugin(), ...plugins]);
          if (isVimMode) ctx.update(prosePluginsCtx, (plugins) => [createMilkdownVimPlugin(), ...plugins]);
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            if (!active) return;
            queueSave(markdown);
          });
          ctx.get(listenerCtx).blur((listenerContext) => {
            if (active) queueSave(currentMarkdown(listenerContext));
          });
          ctx.get(listenerCtx).destroy((listenerContext) => {
            queueSave(currentMarkdown(listenerContext), false);
            active = false;
          });
        });
    },
    [isVimMode, path, queueSave],
  );
  const getEditorRef = useRef(get);

  useEffect(() => {
    getEditorRef.current = get;
  }, [get]);

  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    parseRef.current = (markdown) => editor.action((ctx) => ctx.get(parserCtx)(markdown));
  }, [loading, get]);

  // Auto-focus the editor when Milkdown finishes loading so vim keys work
  // immediately after file open. Use the editor's own view to focus so the
  // correct instance is targeted even if multiple editors exist in the DOM.
  useEffect(() => {
    if (loading) return;
    const id = requestAnimationFrame(() => {
      if (document.activeElement?.closest('[role="dialog"]')) return;
      get()?.action((ctx) => ctx.get(editorViewCtx).focus());
    });
    return () => cancelAnimationFrame(id);
  }, [loading, get]);

  useEffect(() => {
    mountedRef.current = true;
    const flushCurrentDocument = () => {
      const editor = getEditorRef.current();
      editor?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        queueSave(ctx.get(serializerCtx)(view.state.doc), false);
      });
    };
    window.addEventListener("beforeunload", flushCurrentDocument);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("beforeunload", flushCurrentDocument);
      flushCurrentDocument();
    };
  }, [queueSave]);

  return { loading, saveStatus };
};
