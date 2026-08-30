import type { EditorView } from "@milkdown/kit/prose/view";
import { Plugin, Selection, TextSelection } from "@milkdown/kit/prose/state";
import { redo, undo } from "@milkdown/kit/prose/history";
import {
  chainCommands,
  createParagraphNear,
  liftEmptyBlock,
  newlineInCode,
  splitBlock,
} from "@milkdown/kit/prose/commands";
import { splitListItem } from "@milkdown/kit/prose/schema-list";

export type VimMode = "normal" | "insert" | "visual" | "visual-line";
export const VIM_MODE_EVENT = "milkdown-vim-mode-change";
export const VIM_COMMAND_EVENT = "milkdown-vim-command-change";

type Reg = { text: string; linewise: boolean };

export const createMilkdownVimPlugin = () => {
  // ── Plugin state ──────────────────────────────────────────────────────────
  let mode: VimMode = "normal";
  let count = 0;
  let pending: string | null = null;  // first key of a 2-char sequence
  let operator: string | null = null; // pending operator: d/c/y/>/<
  let pendingObj: "i" | "a" | null = null; // text-object qualifier
  let visualAnchor: number | null = null;
  let lastFind: { char: string; fwd: boolean; till: boolean } | null = null;
  let lastAction: (() => void) | null = null;
  let lastInsertText = "";
  let activeReg = '"';
  const regs: Record<string, Reg> = {};
  const marks: Record<string, number> = {};
  const jumps: number[] = [];
  let jumpIdx = -1;
  let lastSearch = "";
  let lastSearchFwd = true;
  let lastSearchIsWord = false;
  let shownCommand = "";
  let commandComplete = false;
  let commandClearTimer: ReturnType<typeof setTimeout> | undefined;
  // A printable Normal/Visual command may still produce a native beforeinput
  // event after its keydown handler has switched to Insert mode (WKWebView).
  // Keep the command key armed until that event or its keyup arrives.
  let pendingNativeInputKey: string | null = null;

  const emitCommand = (command: string) => {
    document.dispatchEvent(new CustomEvent(VIM_COMMAND_EVENT, { detail: command }));
  };

  const clearShownCommand = () => {
    clearTimeout(commandClearTimer);
    shownCommand = "";
    commandComplete = false;
    emitCommand("");
  };

  const showNormalKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey) return;
    clearTimeout(commandClearTimer);
    if (commandComplete) shownCommand = "";
    commandComplete = false;
    const key = event.key === " " ? "Space" : event.key;
    shownCommand += event.ctrlKey ? `Ctrl-${key}` : key;
    emitCommand(shownCommand);
  };

  const scheduleCommandClear = () => {
    if (count > 0 || pending !== null || operator !== null || pendingObj !== null) return;
    clearTimeout(commandClearTimer);
    commandComplete = true;
    commandClearTimer = setTimeout(clearShownCommand, 1200);
  };

  // ── Mode (raw setter — use transition helpers below, not this directly) ───
  const setMode = (view: EditorView, m: VimMode) => {
    mode = m;
    view.dom.dataset.vimMode = m;
    // caret-shape is unsupported in WebKit; only set caret-color.
    view.dom.style.setProperty("caret-color", m === "insert" ? "var(--foreground)" : "#2563eb", "important");
    document.dispatchEvent(new CustomEvent(VIM_MODE_EVENT, { detail: m }));
    if (m !== "normal") clearShownCommand();
  };

  // ── Mode transition helpers (single responsibility) ───────────────────────

  // All exits to normal mode go through here — handles insert/visual cleanup.
  const exitToNormal = (view: EditorView) => {
    if (mode === "normal") return;
    if (mode === "insert" && lastInsertText) {
      const text = lastInsertText;
      lastAction = () => { view.dispatch(view.state.tr.insertText(text)); };
    }
    lastInsertText = "";
    if (mode === "visual" || mode === "visual-line") {
      const head = view.state.selection.head;
      visualAnchor = null;
      setCursor(view, head);
    }
    setMode(view, "normal");
  };

  // All entries to insert mode go through here — resets insert tracking.
  const enterInsert = (view: EditorView) => {
    lastInsertText = "";
    setMode(view, "insert");
    // Only focus when not already focused. Calling view.focus() on an already-
    // focused element can trigger a WKWebView focus cycle (blur → refocus),
    // visually detaching the cursor. The focusout handler covers unexpected blur.
    if (document.activeElement !== view.dom) view.focus();
  };

  const enterVisual = (view: EditorView) => {
    visualAnchor = curPos(view);
    setMode(view, "visual");
  };

  const enterVisualLine = (view: EditorView) => {
    const pos = curPos(view);
    const tb = tbAt(view, pos);
    if (tb) {
      visualAnchor = tb.from;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, tb.from, tb.to)));
    }
    setMode(view, "visual-line");
  };

  // ── Count ─────────────────────────────────────────────────────────────────
  const takeN = (def = 1) => { const n = count || def; count = 0; return n; };

  // ── Position helpers ──────────────────────────────────────────────────────
  const ds = (view: EditorView) => view.state.doc.content.size;
  const clamp = (view: EditorView, p: number) => Math.max(1, Math.min(p, ds(view) - 1));

  const setCursor = (view: EditorView, pos: number, bias = 1) => {
    const p = clamp(view, pos);
    view.dispatch(view.state.tr.setSelection(
      Selection.near(view.state.doc.resolve(p), bias)
    ).scrollIntoView());
  };

  const curPos = (view: EditorView) => view.state.selection.from;

  // Character at doc position
  const charAt = (view: EditorView, pos: number): string => {
    if (pos < 1 || pos >= ds(view)) return "";
    const $p = view.state.doc.resolve(pos);
    return $p.parent.textContent[$p.parentOffset] ?? "";
  };

  // Textblock content range (from/to are the text positions inside the node)
  const tbAt = (view: EditorView, pos: number): { from: number; to: number } | null => {
    const safe = clamp(view, pos);
    const $p = view.state.doc.resolve(safe);
    for (let d = $p.depth; d > 0; d--) {
      if ($p.node(d).isTextblock) return { from: $p.start(d), to: $p.end(d) };
    }
    return null;
  };

  // Block node range (including open/close tokens)
  const bnAt = (view: EditorView, pos: number): { from: number; to: number } | null => {
    const safe = clamp(view, pos);
    const $p = view.state.doc.resolve(safe);
    for (let d = $p.depth; d > 0; d--) {
      if ($p.node(d).isBlock) return { from: $p.before(d), to: $p.after(d) };
    }
    return null;
  };

  // Open a line using schema-aware Enter commands. Inserting a paragraph node
  // directly breaks structured blocks such as lists and code blocks.
  const openLine = (view: EditorView, above: boolean): boolean => {
    const tb = tbAt(view, curPos(view));
    if (!tb) return false;

    const edge = above ? tb.from : tb.to;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, edge)));

    const listItem = view.state.schema.nodes.list_item;
    const command = chainCommands(
      newlineInCode,
      ...(listItem ? [splitListItem(listItem)] : []),
      createParagraphNear,
      liftEmptyBlock,
      splitBlock,
    );
    return command(view.state, view.dispatch, view);
  };

  // Text of current textblock and cursor column within it
  const lineInfo = (view: EditorView, pos?: number) => {
    const p = pos ?? curPos(view);
    const tb = tbAt(view, p);
    if (!tb) return null;
    const text = view.state.doc.textBetween(tb.from, tb.to);
    return { text, from: tb.from, to: tb.to, col: p - tb.from };
  };

  const firstNB = (text: string) => { const m = /\S/.exec(text); return m ? m.index : 0; };

  // ── Jump list ─────────────────────────────────────────────────────────────
  const pushJump = (pos: number) => {
    if (jumps[jumpIdx] === pos) return;
    jumps.splice(jumpIdx + 1);
    jumps.push(pos);
    jumpIdx = jumps.length - 1;
    if (jumps.length > 100) { jumps.shift(); jumpIdx--; }
  };

  // ── Sibling block navigation ──────────────────────────────────────────────
  const siblingBlock = (view: EditorView, dir: 1 | -1, fromPos?: number): number | null => {
    const pos = fromPos ?? curPos(view);
    const cur = bnAt(view, pos);
    if (!cur) return null;
    const probe = dir > 0 ? cur.to + 1 : cur.from - 1;
    if (probe < 1 || probe >= ds(view)) return null;
    const tb = tbAt(view, probe);
    return tb ? tb.from : null;
  };

  // ── Register helpers ──────────────────────────────────────────────────────
  const storeReg = (text: string, linewise: boolean) => {
    const r: Reg = { text, linewise };
    regs['"'] = r;
    if (/^[a-z]$/.test(activeReg)) { regs[activeReg] = r; }
    else if (/^[A-Z]$/.test(activeReg)) {
      const k = activeReg.toLowerCase();
      regs[k] = { text: (regs[k]?.text ?? "") + "\n" + text, linewise: true };
    }
    activeReg = '"';
  };

  const storeYank = (text: string, linewise: boolean) => {
    const r: Reg = { text, linewise };
    regs['"'] = r; regs["0"] = r;
    if (/^[a-z]$/.test(activeReg)) { regs[activeReg] = r; }
    else if (/^[A-Z]$/.test(activeReg)) {
      const k = activeReg.toLowerCase();
      regs[k] = { text: (regs[k]?.text ?? "") + "\n" + text, linewise: true };
    }
    activeReg = '"';
  };

  const fetchReg = (): Reg | null => {
    if (activeReg === "0") return regs["0"] ?? null;
    if (/^[a-zA-Z]$/.test(activeReg)) return regs[activeReg.toLowerCase()] ?? null;
    return regs['"'] ?? null;
  };

  // ── Word motions ──────────────────────────────────────────────────────────
  const isWC = (c: string) => /\w/.test(c);
  const isSp = (c: string) => c === "" || /\s/.test(c);
  const charKind = (c: string, W: boolean) => isSp(c) ? 0 : (W ? 1 : (isWC(c) ? 1 : 2));

  const wordFwd = (view: EditorView, pos: number, W: boolean, n: number): number => {
    let p = pos;
    for (let i = 0; i < n; i++) {
      const k0 = charKind(charAt(view, p), W);
      if (k0 !== 0) { while (p < ds(view) && charKind(charAt(view, p), W) === k0) p++; }
      while (p < ds(view) && charKind(charAt(view, p), W) === 0) p++;
    }
    return clamp(view, p);
  };

  const wordBack = (view: EditorView, pos: number, W: boolean, n: number): number => {
    let p = pos;
    for (let i = 0; i < n; i++) {
      p--;
      while (p > 1 && charKind(charAt(view, p), W) === 0) p--;
      const k = charKind(charAt(view, p), W);
      if (k !== 0) { while (p > 1 && charKind(charAt(view, p - 1), W) === k) p--; }
    }
    return clamp(view, p);
  };

  const wordEnd = (view: EditorView, pos: number, W: boolean, n: number): number => {
    let p = pos;
    for (let i = 0; i < n; i++) {
      p++;
      while (p < ds(view) && charKind(charAt(view, p), W) === 0) p++;
      const k = charKind(charAt(view, p), W);
      if (k !== 0) { while (p < ds(view) - 1 && charKind(charAt(view, p + 1), W) === k) p++; }
    }
    return clamp(view, p);
  };

  // ── Find in line ──────────────────────────────────────────────────────────
  const findInLine = (view: EditorView, pos: number, ch: string, fwd: boolean, till: boolean): number | null => {
    const info = lineInfo(view, pos);
    if (!info) return null;
    if (fwd) {
      const idx = info.text.indexOf(ch, info.col + 1);
      if (idx === -1) return null;
      return info.from + (till ? idx - 1 : idx);
    } else {
      const idx = info.text.lastIndexOf(ch, info.col - 1);
      if (idx === -1) return null;
      return info.from + (till ? idx + 1 : idx);
    }
  };

  // ── Screen helpers ────────────────────────────────────────────────────────
  const screenPos = (view: EditorView, which: "H" | "M" | "L"): number => {
    const r = view.dom.getBoundingClientRect();
    const y = which === "H" ? r.top + 20 : which === "L" ? r.bottom - 20 : (r.top + r.bottom) / 2;
    const p = view.posAtCoords({ left: r.left + 20, top: y });
    return p ? clamp(view, p.pos) : curPos(view);
  };

  const scrollEl = (view: EditorView): HTMLElement =>
    (view.dom.closest(".overflow-y-auto, .overflow-y-scroll") as HTMLElement) ??
    (view.dom.parentElement as HTMLElement);

  const doScroll = (view: EditorView, delta: number) => { scrollEl(view).scrollTop += delta; };

  // ── Document-level search ─────────────────────────────────────────────────
  const findInDoc = (full: string, fwd: boolean, from: number): number => {
    if (lastSearchIsWord) {
      const esc = lastSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${esc}\\b`, "g");
      if (fwd) {
        re.lastIndex = from;
        const m = re.exec(full);
        return m ? m.index : -1;
      } else {
        let last = -1;
        let m: RegExpExecArray | null;
        while ((m = re.exec(full)) !== null && m.index < from) last = m.index;
        return last;
      }
    }
    return fwd ? full.indexOf(lastSearch, from) : full.lastIndexOf(lastSearch, from - 1);
  };

  // ── Record and execute an action for dot-repeat ──────────────────────────
  const recordAction = (fn: () => void) => { lastAction = fn; fn(); };

  // ── Operator application ──────────────────────────────────────────────────
  const applyOp = (view: EditorView, op: string, from: number, to: number) => {
    const { doc, schema, tr } = view.state;
    const f = Math.min(from, to);
    const t = Math.max(from, to);
    const text = doc.textBetween(f, t, "\n");

    if (op === "y") { storeYank(text, false); return; }

    storeReg(text, false);

    if (op === "d" || op === "c") {
      // These ranges are inline text ranges. Replacing them with a paragraph
      // node is invalid for a single top-level paragraph and creates stray
      // empty blocks, so always delete the range and let the schema preserve
      // the required empty paragraph.
      view.dispatch(tr.delete(f, t).scrollIntoView());
      // Caller is responsible for enterInsert() when op === "c"
      return;
    }

    // Collect textblocks in the range; apply changes per-block in reverse order
    // so earlier steps don't shift later positions.
    if (op === ">" || op === "<" || op === "gu" || op === "gU" || op === "~") {
      const blocks: { from: number; to: number; text: string }[] = [];
      doc.nodesBetween(f, t, (node, pos) => {
        if (node.isTextblock) {
          blocks.push({ from: pos + 1, to: pos + node.nodeSize - 1, text: node.textContent });
          return false;
        }
      });
      const newTr = view.state.tr;
      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i]!;
        let result: string;
        if (op === ">") result = "  " + b.text;
        else if (op === "<") result = b.text.replace(/^ {2}/, "");
        else if (op === "gu") result = b.text.toLowerCase();
        else if (op === "gU") result = b.text.toUpperCase();
        else result = b.text.split("").map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join("");
        if (result !== b.text) {
          if (result) newTr.replaceWith(b.from, b.to, schema.text(result));
          else newTr.delete(b.from, b.to);
        }
      }
      if (newTr.steps.length > 0) view.dispatch(newTr.scrollIntoView());
    }
  };

  // ── Linewise ops ──────────────────────────────────────────────────────────
  const deleteLine = (view: EditorView) => {
    const tb = tbAt(view, curPos(view));
    const bn = bnAt(view, curPos(view));
    if (!tb || !bn) return;
    const { doc, schema, tr } = view.state;
    storeReg(doc.textBetween(tb.from, tb.to), true);
    if (doc.childCount === 1) {
      const para = schema.nodes.paragraph?.createAndFill();
      if (para) view.dispatch(tr.replaceWith(bn.from, bn.to, para).scrollIntoView());
    } else {
      view.dispatch(tr.delete(bn.from, bn.to).scrollIntoView());
    }
  };

  // ── Paste ─────────────────────────────────────────────────────────────────
  const doPaste = (view: EditorView, before: boolean) => {
    const reg = fetchReg() ?? regs['"'];
    if (!reg) return;
    const { schema, tr } = view.state;
    const pos = curPos(view);
    if (reg.linewise) {
      const bn = bnAt(view, pos);
      if (!bn) return;
      // Split stored text at newlines; each line becomes a separate paragraph.
      const lines = reg.text.split("\n");
      const paras = lines.map(line =>
        schema.nodes.paragraph?.createAndFill(
          undefined, line ? schema.text(line) : undefined
        )
      ).filter(Boolean) as ReturnType<typeof schema.nodes.paragraph.createAndFill>[];
      if (!paras.length) return;
      const at = before ? bn.from : bn.to;
      view.dispatch(tr.insert(at, paras as never).scrollIntoView());
      setCursor(view, at + 1);
    } else {
      const at = before ? pos : Math.min(pos + 1, ds(view));
      view.dispatch(tr.insertText(reg.text, at).scrollIntoView());
      if (reg.text.length > 0) setCursor(view, at + reg.text.length - 1);
    }
    activeReg = '"';
  };

  // ── Text objects ──────────────────────────────────────────────────────────
  const textObj = (view: EditorView, inner: boolean, obj: string): { from: number; to: number } | null => {
    const pos = curPos(view);
    const info = lineInfo(view, pos);
    if (!info) return null;
    const { text, from, col } = info;

    if (obj === "w" || obj === "W") {
      const W = obj === "W";
      const k0 = charKind(charAt(view, pos), W);
      let l = pos, r = pos;
      if (k0 !== 0) {
        while (l > from && charKind(charAt(view, l - 1), W) === k0) l--;
        while (r < from + text.length && charKind(charAt(view, r), W) === k0) r++;
        if (!inner) while (r < from + text.length && isSp(charAt(view, r))) r++;
      } else {
        while (l > from && isSp(charAt(view, l - 1))) l--;
        while (r < from + text.length && isSp(charAt(view, r))) r++;
      }
      return { from: l, to: r };
    }

    const pairs: Record<string, [string, string]> = {
      '"': ['"', '"'], "'": ["'", "'"], "`": ["`", "`"],
      "(": ["(", ")"], ")": ["(", ")"], "b": ["(", ")"],
      "[": ["[", "]"], "]": ["[", "]"],
      "{": ["{", "}"], "}": ["{", "}"], "B": ["{", "}"],
      "<": ["<", ">"], ">": ["<", ">"],
    };
    const pair = pairs[obj];
    if (!pair) return null;
    const [open, close] = pair;
    const same = open === close;

    if (same) {
      let l = col - 1;
      while (l >= 0 && text[l] !== open) l--;
      if (l < 0) return null;
      let r = col;
      while (r < text.length && text[r] !== close) r++;
      if (r >= text.length) return null;
      return inner ? { from: from + l + 1, to: from + r } : { from: from + l, to: from + r + 1 };
    } else {
      let l = col, depth = 0;
      while (l >= 0) {
        if (text[l] === close) depth++;
        else if (text[l] === open) { if (depth === 0) break; depth--; }
        l--;
      }
      if (l < 0) return null;
      let r = col + 1, depth2 = 0;
      while (r < text.length) {
        if (text[r] === open) depth2++;
        else if (text[r] === close) { if (depth2 === 0) break; depth2--; }
        r++;
      }
      if (r >= text.length) return null;
      return inner ? { from: from + l + 1, to: from + r } : { from: from + l, to: from + r + 1 };
    }
  };

  // ── Visual mode helpers ───────────────────────────────────────────────────
  const moveVisualHead = (view: EditorView, newHead: number) => {
    const bounded = clamp(view, newHead);
    view.dispatch(view.state.tr.setSelection(
      TextSelection.create(view.state.doc, visualAnchor!, bounded)
    ).scrollIntoView());
  };

  const getVisualRange = (view: EditorView): { from: number; to: number } => {
    const sel = view.state.selection as TextSelection;
    const f = Math.min(sel.anchor, sel.head);
    const t = Math.max(sel.anchor, sel.head);
    if (mode === "visual-line") {
      return { from: tbAt(view, f)?.from ?? f, to: tbAt(view, t)?.to ?? t };
    }
    return { from: f, to: t };
  };

  // exitVisual → use exitToNormal(view) directly

  // ── Join lines ────────────────────────────────────────────────────────────
  const doJoin = (view: EditorView, addSpace: boolean) => {
    const pos = curPos(view);
    const bn1 = bnAt(view, pos);
    if (!bn1) return;
    const nextStart = bn1.to + 1;
    if (nextStart >= ds(view)) return;
    const tb1 = tbAt(view, pos);
    const tb2 = tbAt(view, nextStart);
    const bn2 = bnAt(view, nextStart);
    if (!tb1 || !tb2 || !bn2) return;
    const t1 = view.state.doc.textBetween(tb1.from, tb1.to);
    const t2 = view.state.doc.textBetween(tb2.from, tb2.to);
    const joined = t1 + (addSpace ? " " : "") + t2;
    const { schema, tr } = view.state;
    view.dispatch(tr.replaceWith(
      bn1.from, bn2.to,
      schema.nodes.paragraph!.createAndFill(undefined, joined ? schema.text(joined) : undefined)!
    ).scrollIntoView());
  };

  // ── Apply operator to a range derived from a motion target ────────────────
  const execOp = (view: EditorView, target: number) => {
    const op = operator!;
    operator = null;
    const pos = curPos(view);
    applyOp(view, op, Math.min(pos, target), Math.max(pos, target));
  };

  // ── Motion → position (used by both operator and normal movement) ─────────
  const resolveMotion = (view: EditorView, key: string, n: number): number | null => {
    const pos = curPos(view);
    switch (key) {
      case "h": return clamp(view, pos - n);
      case "l": return clamp(view, pos + n);
      case "0": return tbAt(view, pos)?.from ?? null;
      case "^": { const info = lineInfo(view); return info ? info.from + firstNB(info.text) : null; }
      case "$": { const tb = tbAt(view, pos); return tb ? Math.max(tb.from, tb.to - 1) : null; }
      case "g_": { const info = lineInfo(view); return info ? info.from + Math.max(0, info.text.trimEnd().length - 1) : null; }
      case "w": return wordFwd(view, pos, false, n);
      case "W": return wordFwd(view, pos, true, n);
      case "b": return wordBack(view, pos, false, n);
      case "B": return wordBack(view, pos, true, n);
      case "e": return wordEnd(view, pos, false, n);
      case "E": return wordEnd(view, pos, true, n);
      case "G": return clamp(view, ds(view) - 1);
      case "H": return screenPos(view, "H");
      case "M": return screenPos(view, "M");
      case "L": return screenPos(view, "L");
      default: return null;
    }
  };

  // ── Normal mode handler ────────────────────────────────────────────────────
  const handleNormal = (view: EditorView, event: KeyboardEvent): boolean => {
    const key = event.key;
    const ctrl = event.ctrlKey;
    if (event.metaKey) return false;

    // ── pending: register prefix ──
    if (pending === '"') {
      pending = null;
      if (/^[0-9a-zA-Z"+*_]$/.test(key)) activeReg = key;
      return true;
    }

    // ── pending: r + char (replace) ──
    if (pending === "r") {
      pending = null;
      if (key.length === 1 && !ctrl) {
        const key_ = key;
        recordAction(() => {
          const p = curPos(view);
          const tb_ = tbAt(view, p);
          if (tb_ && p < tb_.to) {
            view.dispatch(view.state.tr.replaceWith(p, p + 1, view.state.schema.text(key_)).scrollIntoView());
          }
        });
      }
      return true;
    }

    // ── pending: g prefix ──
    if (pending === "g") {
      pending = null;
      const n = takeN();
      const pos = curPos(view);

      if (key === "g") {
        const target = 1;
        if (operator) {
          const op_ = operator;
          if (op_ !== "c") { lastAction = () => { const p = curPos(view); applyOp(view, op_, Math.min(p, 1), Math.max(p, 1)); }; }
          execOp(view, target);
          if (op_ === "c") enterInsert(view);
        } else { pushJump(pos); setCursor(view, target); }
        return true;
      }
      if (key === "e") {
        const t = wordEnd(view, wordBack(view, pos, false, n), false, 1);
        if (operator) {
          const op_ = operator; const n_ = n;
          if (op_ !== "c") { lastAction = () => { const p = curPos(view); const tt = wordEnd(view, wordBack(view, p, false, n_), false, 1); applyOp(view, op_, Math.min(p, tt), Math.max(p, tt)); }; }
          execOp(view, t);
          if (op_ === "c") enterInsert(view);
        } else setCursor(view, t);
        return true;
      }
      if (key === "E") {
        const t = wordEnd(view, wordBack(view, pos, true, n), true, 1);
        if (operator) {
          const op_ = operator; const n_ = n;
          if (op_ !== "c") { lastAction = () => { const p = curPos(view); const tt = wordEnd(view, wordBack(view, p, true, n_), true, 1); applyOp(view, op_, Math.min(p, tt), Math.max(p, tt)); }; }
          execOp(view, t);
          if (op_ === "c") enterInsert(view);
        } else setCursor(view, t);
        return true;
      }
      if (key === "_") { const info = lineInfo(view); if (info) { const t = info.from + Math.max(0, info.text.trimEnd().length - 1); if (operator) execOp(view, t); else setCursor(view, t); } return true; }
      if (key === "J") { doJoin(view, false); return true; }
      if (key === "i") { if (operator) { pendingObj = "i"; return true; } return true; }
      if (key === "a") { if (operator) { pendingObj = "a"; return true; } return true; }
      if (!operator) {
        if (key === "u") { operator = "gu"; return true; }
        if (key === "U") { operator = "gU"; return true; }
        if (key === "~") { operator = "~"; return true; }
      }
      if (operator) operator = null;
      return true;
    }

    // ── pending: z prefix ──
    if (pending === "z") {
      pending = null;
      const el = scrollEl(view);
      const coords = view.coordsAtPos(curPos(view));
      if (coords) {
        const rect = el.getBoundingClientRect();
        const relY = coords.top - rect.top;
        if (key === "z") el.scrollTop += relY - el.clientHeight / 2;
        else if (key === "t") el.scrollTop += relY - 40;
        else if (key === "b") el.scrollTop += relY - el.clientHeight + 40;
      }
      return true;
    }

    // ── pending: f/F/t/T + char ──
    if (pending === "f" || pending === "F" || pending === "t" || pending === "T") {
      const fwd = pending === "f" || pending === "t";
      const till = pending === "t" || pending === "T";
      pending = null;
      if (key.length === 1) {
        lastFind = { char: key, fwd, till };
        const n = takeN();
        let pos = curPos(view);
        for (let i = 0; i < n; i++) {
          const p = findInLine(view, pos, key, fwd, till);
          if (p !== null) pos = p; else break;
        }
        if (operator) {
          const op_ = operator;
          const key_ = key; const fwd_ = fwd; const till_ = till; const n_ = n;
          if (op_ !== "c") {
            lastAction = () => {
              const p0 = curPos(view);
              let t = p0;
              for (let i = 0; i < n_; i++) { const np = findInLine(view, t, key_, fwd_, till_); if (np !== null) t = np; else break; }
              applyOp(view, op_, Math.min(p0, t), Math.max(p0, t));
            };
          }
          execOp(view, pos);
          if (op_ === "c") enterInsert(view);
        } else {
          setCursor(view, pos);
        }
      }
      return true;
    }

    // ── pending: m + char (set mark) ──
    if (pending === "m") {
      pending = null;
      if (/^[a-zA-Z`'<>]$/.test(key)) marks[key] = curPos(view);
      return true;
    }

    // ── pending: ` or ' + char (jump to mark) ──
    if (pending === "`" || pending === "'") {
      const useCol = pending === "`";
      pending = null;
      if (/^[a-zA-Z`']$/.test(key)) {
        const target = marks[key];
        if (target !== undefined) {
          pushJump(curPos(view));
          if (useCol) setCursor(view, target);
          else { const info = lineInfo(view, target); if (info) setCursor(view, info.from + firstNB(info.text)); }
        }
      }
      return true;
    }

    // ── pending: @ (macro play) ──
    if (pending === "@") { pending = null; return true; }

    // ── pending text object ──
    if (pendingObj !== null && operator !== null) {
      const inner = pendingObj === "i";
      pendingObj = null;
      const range = textObj(view, inner, key);
      if (range) {
        const op = operator!;
        operator = null;
        if (op !== "c") {
          const inner_ = inner; const key_ = key;
          lastAction = () => { const r = textObj(view, inner_, key_); if (r) applyOp(view, op, r.from, r.to); };
        }
        applyOp(view, op, range.from, range.to);
        if (op === "c") enterInsert(view);
      } else {
        operator = null;
      }
      return true;
    }

    // ── operator pending: wait for motion / text obj ──
    if (operator !== null) {
      const op = operator;
      if (key === "i") { pendingObj = "i"; return true; }
      if (key === "a") { pendingObj = "a"; return true; }
      if (key === "g") { pending = "g"; return true; }
      if (key === "f" || key === "F" || key === "t" || key === "T") { pending = key; return true; }

      const n = takeN();
      const pos = curPos(view);

      // double operator → linewise
      const doubleSuffix: Record<string, string> = { d: "d", c: "c", y: "y", ">": ">", "<": "<", gu: "u", gU: "U", "~": "~" };
      const sfx = doubleSuffix[op];
      if (sfx && key === sfx) {
        operator = null;
        const tb = tbAt(view, pos);
        if (!tb) return true;
        if (op === "y") {
          const lines: string[] = [];
          let cur = pos;
          for (let i = 0; i < n; i++) {
            const tb = tbAt(view, cur);
            if (tb) lines.push(view.state.doc.textBetween(tb.from, tb.to));
            const nx = siblingBlock(view, 1, cur);
            if (nx === null) break;
            cur = nx;
          }
          storeYank(lines.join("\n"), true);
          return true;
        }
        if (op === "d") {
          const n_ = n;
          recordAction(() => { for (let i = 0; i < n_; i++) deleteLine(view); });
          return true;
        }
        if (op === "c") { applyOp(view, "c", tb.from, tb.to); enterInsert(view); return true; }
        const op_ = op;
        recordAction(() => { const tb_ = tbAt(view, curPos(view)); if (tb_) applyOp(view, op_, tb_.from, tb_.to); });
        return true;
      }
      const target = resolveMotion(view, key, n);
      if (target !== null) {
        const op_ = op; const key_ = key; const n_ = n;
        operator = null;
        if (op_ !== "c") {
          lastAction = () => {
            const p = curPos(view);
            const t = resolveMotion(view, key_, n_);
            if (t !== null) applyOp(view, op_, Math.min(p, t), Math.max(p, t));
          };
        }
        applyOp(view, op_, Math.min(pos, target), Math.max(pos, target));
        if (op_ === "c") enterInsert(view);
        return true;
      }

      operator = null;
      return true;
    }

    // ── Count accumulation ──
    if (/^[1-9]$/.test(key) || (count > 0 && key === "0" && !ctrl)) {
      count = count * 10 + parseInt(key);
      return true;
    }

    // ── Ctrl keys ──
    if (ctrl) {
      const n = takeN();
      switch (key.toLowerCase()) {
        case "r": redo(view.state, view.dispatch); return true;
        case "d": doScroll(view, n * 22); setCursor(view, screenPos(view, "M")); return true;
        case "u": doScroll(view, -n * 22); setCursor(view, screenPos(view, "M")); return true;
        case "f": doScroll(view, window.innerHeight * 0.8); return true;
        case "b": doScroll(view, -window.innerHeight * 0.8); return true;
        case "e": doScroll(view, 22); return true;
        case "y": doScroll(view, -22); return true;
        case "a": case "x": {
          const info = lineInfo(view);
          if (info) {
            const m = /\d+/.exec(info.text.slice(info.col));
            if (m) {
              const start = info.from + info.col + m.index;
              const val = parseInt(m[0]) + (key.toLowerCase() === "a" ? n : -n);
              view.dispatch(view.state.tr.replaceWith(start, start + m[0].length, view.state.schema.text(String(val))));
            }
          }
          return true;
        }
        case "o": { if (jumpIdx >= 0) { const p = jumps[jumpIdx]; if (jumpIdx > 0) jumpIdx--; if (p !== undefined) setCursor(view, p); } return true; }
        case "i": { if (jumpIdx < jumps.length - 1) { jumpIdx++; const p = jumps[jumpIdx]; if (p !== undefined) setCursor(view, p); } return true; }
      }
      return false;
    }

    const n = takeN();
    const pos = curPos(view);

    // Repeat last change — must live outside the switch to avoid TS narrowing
    // `lastAction` to `never` due to its control-flow analysis of large switch blocks.
    if (key === ".") { for (let i = 0; i < n; i++) (lastAction as (() => void) | null)?.(); return true; }

    switch (key) {
      // ── Insert entry ──
      case "i": enterInsert(view); return true;
      case "I": { const info = lineInfo(view); if (info) setCursor(view, info.from + firstNB(info.text)); enterInsert(view); return true; }
      case "a": setCursor(view, pos + 1); enterInsert(view); return true;
      case "A": { const tb = tbAt(view, pos); if (tb) setCursor(view, tb.to); enterInsert(view); return true; }
      case "o": {
        openLine(view, false);
        enterInsert(view); return true;
      }
      case "O": {
        openLine(view, true);
        // splitBlock at tb.from puts the cursor at the start of Block B (original content).
        // Move back to Block A (the newly created empty line above).
        const prev = siblingBlock(view, -1, curPos(view));
        if (prev !== null) setCursor(view, prev);
        enterInsert(view); return true;
      }
      case "s": {
        const tb = tbAt(view, pos);
        if (tb && pos < tb.to) {
          const end = Math.min(pos + n, tb.to);
          storeReg(view.state.doc.textBetween(pos, end), false);
          view.dispatch(view.state.tr.delete(pos, end));
        }
        enterInsert(view); return true;
      }
      case "S": { const tb = tbAt(view, pos); if (tb) { applyOp(view, "c", tb.from, tb.to); enterInsert(view); } return true; }
      case "C": { const tb = tbAt(view, pos); if (tb) { applyOp(view, "c", pos, tb.to); enterInsert(view); } return true; }
      case "D": {
        recordAction(() => { const p = curPos(view); const tb_ = tbAt(view, p); if (tb_) applyOp(view, "d", p, tb_.to); });
        return true;
      }

      // ── Operators ──
      case "d": operator = "d"; return true;
      case "c": operator = "c"; return true;
      case "y": operator = "y"; return true;
      case ">": operator = ">"; return true;
      case "<": operator = "<"; return true;

      // ── Toggle case ──
      case "~": {
        const n_ = n;
        recordAction(() => {
          const p = curPos(view);
          const tb_ = tbAt(view, p);
          if (tb_ && p < tb_.to) {
            const end = Math.min(p + n_, tb_.to);
            const text = view.state.doc.textBetween(p, end);
            const flipped = text.split("").map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join("");
            view.dispatch(view.state.tr.replaceWith(p, end, view.state.schema.text(flipped)));
            setCursor(view, Math.min(p + n_, tb_.to - 1));
          }
        });
        return true;
      }

      // ── Pending prefix keys ──
      case "g": pending = "g"; return true;
      case "z": pending = "z"; return true;
      case "r": pending = "r"; return true;
      case "f": case "F": case "t": case "T": pending = key; return true;
      case "m": pending = "m"; return true;
      case "`": pending = "`"; return true;
      case "'": pending = "'"; return true;
      case "q": return true; // macro record (simplified: no-op)
      case "@": pending = "@"; return true;
      case '"': pending = '"'; return true;

      // ── Find repeat ──
      case ";": {
        if (lastFind) { let p = pos; for (let i = 0; i < n; i++) { const np = findInLine(view, p, lastFind.char, lastFind.fwd, lastFind.till); if (np !== null) p = np; else break; } setCursor(view, p); }
        return true;
      }
      case ",": {
        if (lastFind) { let p = pos; for (let i = 0; i < n; i++) { const np = findInLine(view, p, lastFind.char, !lastFind.fwd, lastFind.till); if (np !== null) p = np; else break; } setCursor(view, p); }
        return true;
      }

      // ── Movement ──
      case "h": setCursor(view, pos - n, -1); return true;
      case "l": setCursor(view, pos + n); return true;
      case "j": { let p = pos; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, 1, p); if (nx === null) break; p = nx; } setCursor(view, p); return true; }
      case "k": { let p = pos; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, -1, p); if (nx === null) break; p = nx; } setCursor(view, p); return true; }
      case "w": setCursor(view, wordFwd(view, pos, false, n)); return true;
      case "W": setCursor(view, wordFwd(view, pos, true, n)); return true;
      case "b": setCursor(view, wordBack(view, pos, false, n)); return true;
      case "B": setCursor(view, wordBack(view, pos, true, n)); return true;
      case "e": setCursor(view, wordEnd(view, pos, false, n)); return true;
      case "E": setCursor(view, wordEnd(view, pos, true, n)); return true;
      case "0": { const tb = tbAt(view, pos); if (tb) setCursor(view, tb.from, -1); return true; }
      case "^": { const info = lineInfo(view); if (info) setCursor(view, info.from + firstNB(info.text)); return true; }
      case "$": { const tb = tbAt(view, pos); if (tb) setCursor(view, Math.max(tb.from, tb.to - 1)); return true; }
      case "{": { let p = pos; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, -1, p); p = nx !== null ? nx : 1; if (nx === null) break; } setCursor(view, p); return true; }
      case "}": { let p = pos; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, 1, p); p = nx !== null ? nx : ds(view) - 1; if (nx === null) break; } setCursor(view, p); return true; }
      case "G": { pushJump(pos); setCursor(view, ds(view) - 1); return true; }
      case "H": setCursor(view, screenPos(view, "H")); return true;
      case "M": setCursor(view, screenPos(view, "M")); return true;
      case "L": setCursor(view, screenPos(view, "L")); return true;
      case "%": {
        const info = lineInfo(view);
        if (info) {
          const pairs: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{" };
          const ch = info.text[info.col] ?? "";
          if (pairs[ch]) {
            const inner = ch === ")" || ch === "]" || ch === "}";
            const range = textObj(view, !inner, inner ? ch : (pairs[ch] ?? ch));
            if (range) setCursor(view, pos === range.from ? range.to - 1 : range.from);
          }
        }
        return true;
      }

      // ── Edit shortcuts ──
      case "x": {
        const n_ = n;
        recordAction(() => {
          const p = curPos(view); const tb_ = tbAt(view, p);
          if (tb_ && p < tb_.to) {
            const end = Math.min(p + n_, tb_.to);
            storeReg(view.state.doc.textBetween(p, end), false);
            view.dispatch(view.state.tr.delete(p, end));
          }
        });
        return true;
      }
      case "X": {
        const n_ = n;
        recordAction(() => {
          const p = curPos(view); const tb_ = tbAt(view, p);
          if (tb_ && p > tb_.from) {
            const start = Math.max(p - n_, tb_.from);
            storeReg(view.state.doc.textBetween(start, p), false);
            view.dispatch(view.state.tr.delete(start, p));
          }
        });
        return true;
      }
      case "J": { const n_ = n; recordAction(() => { for (let i = 0; i < n_; i++) doJoin(view, true); }); return true; }

      // ── Visual ──
      case "v": enterVisual(view); return true;
      case "V": enterVisualLine(view); return true;

      // ── Paste ──
      case "p": { for (let i = 0; i < n; i++) doPaste(view, false); return true; }
      case "P": { for (let i = 0; i < n; i++) doPaste(view, true); return true; }

      // ── Undo/redo ──
      case "u": { for (let i = 0; i < n; i++) undo(view.state, view.dispatch); return true; }
      case "U": { undo(view.state, view.dispatch); return true; }

      // ── Search ──
      case "*": case "#": {
        const info = lineInfo(view);
        if (info) {
          let l = info.col, r = info.col;
          while (l > 0 && isWC(info.text[l - 1]!)) l--;
          while (r < info.text.length && isWC(info.text[r]!)) r++;
          lastSearch = info.text.slice(l, r);
          lastSearchFwd = key === "*";
          lastSearchIsWord = true;
        }
        return true;
      }
      case "n": case "N": {
        if (!lastSearch) return true;
        const fwd = key === "n" ? lastSearchFwd : !lastSearchFwd;
        const full = view.state.doc.textBetween(1, ds(view) - 1, "\n");
        let idx = findInDoc(full, fwd, fwd ? pos : pos - 1);
        if (idx < 0) idx = findInDoc(full, fwd, fwd ? 0 : full.length);
        if (idx >= 0) { pushJump(pos); setCursor(view, idx + 1); }
        return true;
      }

      default: return true;
    }
  };

  // ── Visual mode handler ────────────────────────────────────────────────────
  const handleVisual = (view: EditorView, event: KeyboardEvent): boolean => {
    const key = event.key;
    const ctrl = event.ctrlKey;
    if (event.metaKey) return false;

    // ── pending: g prefix ──
    if (pending === "g") {
      pending = null;
      const n = takeN();
      const head = view.state.selection.head;
      if (key === "g") { moveVisualHead(view, 1); return true; }
      if (key === "e") { moveVisualHead(view, wordEnd(view, wordBack(view, head, false, n), false, 1)); return true; }
      if (key === "E") { moveVisualHead(view, wordEnd(view, wordBack(view, head, true, n), true, 1)); return true; }
      return true;
    }

    // ── pending: f/F/t/T + char ──
    if (pending === "f" || pending === "F" || pending === "t" || pending === "T") {
      const fwd = pending === "f" || pending === "t";
      const till = pending === "t" || pending === "T";
      pending = null;
      if (key.length === 1) {
        lastFind = { char: key, fwd, till };
        const n = takeN();
        let h = view.state.selection.head;
        for (let i = 0; i < n; i++) {
          const p = findInLine(view, h, key, fwd, till);
          if (p !== null) h = p; else break;
        }
        moveVisualHead(view, h);
      }
      return true;
    }

    if (/^[1-9]$/.test(key) || (count > 0 && key === "0" && !ctrl)) {
      count = count * 10 + parseInt(key);
      return true;
    }

    // Ctrl+C / Ctrl+[ / Escape always exits visual mode regardless of pending state.
    if (isInsertExit(event)) { exitToNormal(view); return true; }

    const n = takeN();
    const head = view.state.selection.head;

    const deleteSelection = (toInsert: boolean) => {
      const r = getVisualRange(view);
      const { doc, tr } = view.state;
      storeReg(doc.textBetween(r.from, r.to, "\n"), mode === "visual-line");
      visualAnchor = null;
      // The visual range is an inline range. Deleting it preserves the schema's
      // required empty paragraph when the document has only one top-level block.
      view.dispatch(tr.delete(r.from, r.to).scrollIntoView());
      if (toInsert) enterInsert(view); else exitToNormal(view);
    };

    switch (key) {
      case "v": { if (mode === "visual-line") { setMode(view, "visual"); } else exitToNormal(view); return true; }
      case "V": {
        if (mode === "visual") {
          enterVisualLine(view);
        } else exitToNormal(view);
        return true;
      }
      case "d": case "x": deleteSelection(false); return true;
      case "c": deleteSelection(true); return true;
      case "y": { const r = getVisualRange(view); storeYank(view.state.doc.textBetween(r.from, r.to, "\n"), mode === "visual-line"); exitToNormal(view); return true; }
      case "Y": case "D": { const r = getVisualRange(view); storeYank(view.state.doc.textBetween(r.from, r.to, "\n"), true); exitToNormal(view); return true; }
      case ">": { const r = getVisualRange(view); applyOp(view, ">", r.from, r.to); exitToNormal(view); return true; }
      case "<": { const r = getVisualRange(view); applyOp(view, "<", r.from, r.to); exitToNormal(view); return true; }
      case "~": { const r = getVisualRange(view); applyOp(view, "~", r.from, r.to); exitToNormal(view); return true; }
      case "u": { const r = getVisualRange(view); applyOp(view, "gu", r.from, r.to); exitToNormal(view); return true; }
      case "U": { const r = getVisualRange(view); applyOp(view, "gU", r.from, r.to); exitToNormal(view); return true; }
      case "g": { pending = "g"; return true; }
      case "G": moveVisualHead(view, ds(view) - 1); return true;
      case "j": { let h = head; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, 1, h); if (nx === null) break; h = nx; } moveVisualHead(view, h); return true; }
      case "k": { let h = head; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, -1, h); if (nx === null) break; h = nx; } moveVisualHead(view, h); return true; }
      case "h": moveVisualHead(view, head - n); return true;
      case "l": moveVisualHead(view, head + n); return true;
      case "w": moveVisualHead(view, wordFwd(view, head, false, n)); return true;
      case "W": moveVisualHead(view, wordFwd(view, head, true, n)); return true;
      case "b": moveVisualHead(view, wordBack(view, head, false, n)); return true;
      case "B": moveVisualHead(view, wordBack(view, head, true, n)); return true;
      case "e": moveVisualHead(view, wordEnd(view, head, false, n)); return true;
      case "E": moveVisualHead(view, wordEnd(view, head, true, n)); return true;
      case "0": { const tb = tbAt(view, head); if (tb) moveVisualHead(view, tb.from); return true; }
      case "^": { const info = lineInfo(view, head); if (info) moveVisualHead(view, info.from + firstNB(info.text)); return true; }
      case "$": { const tb = tbAt(view, head); if (tb) moveVisualHead(view, Math.max(tb.from, tb.to - 1)); return true; }
      case "{": { let h = head; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, -1, h); if (nx === null) break; h = nx; } moveVisualHead(view, h); return true; }
      case "}": { let h = head; for (let i = 0; i < n; i++) { const nx = siblingBlock(view, 1, h); if (nx === null) break; h = nx; } moveVisualHead(view, h); return true; }
      case "f": case "F": case "t": case "T": pending = key; return true;
      case "o": {
        const anchor = visualAnchor!;
        visualAnchor = head;
        moveVisualHead(view, anchor);
        return true;
      }
      default: return true;
    }
  };

  // ── Insert mode Ctrl shortcuts ────────────────────────────────────────────
  const handleInsertCtrl = (view: EditorView, event: KeyboardEvent): boolean => {
    const pos = curPos(view);
    switch (event.key.toLowerCase()) {
      case "h": { // backspace
        const tb = tbAt(view, pos);
        if (tb && pos > tb.from) {
          view.dispatch(view.state.tr.delete(pos - 1, pos));
          if (lastInsertText.length > 0) lastInsertText = lastInsertText.slice(0, -1);
        }
        return true;
      }
      case "w": { // delete word back
        const back = wordBack(view, pos, false, 1);
        if (back < pos) view.dispatch(view.state.tr.delete(back, pos));
        lastInsertText = "";
        return true;
      }
      case "u": { // delete to line start
        const tb = tbAt(view, pos);
        if (tb && pos > tb.from) view.dispatch(view.state.tr.delete(tb.from, pos));
        lastInsertText = "";
        return true;
      }
      case "o": { exitToNormal(view); return true; } // one normal command (simplified)
      default: return false;
    }
  };

  // ── Insert-exit key predicate (shared by captureEsc and handleKeyDown) ───
  const isInsertExit = (e: KeyboardEvent) =>
    e.key === "Escape" ||
    (e.ctrlKey && (e.key.toLowerCase() === "c" || e.key === "["));

  // ── Plugin ────────────────────────────────────────────────────────────────
  return new Plugin({
    view: (editorView) => {
      setMode(editorView, mode);

      // Document-level capture-phase listener for insert-mode exit.
      // Running at document level (not editorView.dom) fires before any
      // element-level handlers and gives the best chance of intercepting
      // Escape in WKWebView, which sometimes consumes it at the native layer.
      // We guard with editorView.dom.contains(target) so this only fires
      // when the editor actually has focus.
      const captureEsc = (event: KeyboardEvent) => {
        if (mode !== "insert") return;
        // During IME composition, Escape means "cancel IME input", not "exit insert mode".
        if (event.isComposing) return;
        if (!editorView.dom.contains(event.target as Node) && event.target !== editorView.dom) return;
        if (!isInsertExit(event)) return;
        console.debug("[vim] captureEsc:", event.key, "mode:", mode);
        event.preventDefault();

        // Snapshot BEFORE the WKWebView reversion reaches ProseMirror.
        //
        // On macOS, WKWebView runs NSTextInputClient.interpretKeyEvents: before
        // dispatching the JS keydown event. Pressing Escape triggers
        // cancelOperation:/discardMarkedText:, which can revert the
        // contenteditable DOM. ProseMirror's DOMObserver (MutationObserver) is
        // async — it fires as a microtask after the current JS task. So at this
        // point the model still contains the text the user typed.
        //
        // After this handler returns, microtasks run:
        //   DOMObserver fires → reads reverted DOM → reverts the PM model.
        // The rAF below fires after that, detects the mismatch, and restores.
        const savedDoc = editorView.state.doc;
        const savedHead = editorView.state.selection.head;

        exitToNormal(editorView);

        requestAnimationFrame(() => {
          // By now MutationObserver microtasks have processed any WKWebView-
          // reverted DOM. If the model was reverted, restore from snapshot.
          if (!editorView.state.doc.eq(savedDoc)) {
            const tr = editorView.state.tr
              .replaceWith(0, editorView.state.doc.content.size, savedDoc.content);
            const pos = Math.min(savedHead, tr.doc.content.size - 1);
            tr.setSelection(Selection.near(tr.doc.resolve(Math.max(1, pos))));
            editorView.dispatch(tr);
          }
          // Re-focus so subsequent normal-mode keys reach the editor.
          // WKWebView can blur the contenteditable when handling Escape natively
          // even after event.preventDefault().
          if (mode === "normal" && document.activeElement !== editorView.dom) {
            editorView.focus();
          }
        });
      };
      document.addEventListener("keydown", captureEsc, true);

      const captureKeyUp = (event: KeyboardEvent) => {
        if (pendingNativeInputKey === event.key) pendingNativeInputKey = null;
      };
      document.addEventListener("keyup", captureKeyUp, true);

      // WKWebView can send text through NSTextInputClient/beforeinput before
      // ProseMirror's keydown handler runs. keydown.preventDefault() alone is
      // therefore not a reliable read-only boundary for Normal/Visual mode.
      const blockEditOutsideInsert = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Node) || !editorView.dom.contains(target)) return;
        if (pendingNativeInputKey !== null && event.type === "beforeinput") {
          pendingNativeInputKey = null;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (mode === "insert") return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      const blockedEditEvents = ["beforeinput", "compositionstart", "paste", "cut", "drop"] as const;
      blockedEditEvents.forEach((type) => {
        editorView.dom.addEventListener(type, blockEditOutsideInsert, true);
        // WKWebView may dispatch native clipboard/input events on the
        // document before they reach the contenteditable node.
        document.addEventListener(type, blockEditOutsideInsert, true);
      });

      // Recover focus when WKWebView steals it during insert mode.
      // relatedTarget is null when focus leaves the page entirely (WKWebView
      // native handling). When relatedTarget is non-null the user intentionally
      // clicked another element — do not fight that.
      const onFocusOut = (e: FocusEvent) => {
        if (mode === "insert" && e.relatedTarget === null) {
          requestAnimationFrame(() => {
            if (mode === "insert" && document.activeElement !== editorView.dom) {
              editorView.focus();
            }
          });
        }
      };
      editorView.dom.addEventListener("focusout", onFocusOut);

      return {
        destroy: () => {
          document.removeEventListener("keydown", captureEsc, true);
          document.removeEventListener("keyup", captureKeyUp, true);
          blockedEditEvents.forEach((type) => {
            editorView.dom.removeEventListener(type, blockEditOutsideInsert, true);
            document.removeEventListener(type, blockEditOutsideInsert, true);
          });
          editorView.dom.removeEventListener("focusout", onFocusOut);
          editorView.dom.removeAttribute("data-vim-mode");
          editorView.dom.style.removeProperty("caret-color");
          pending = null; operator = null; pendingObj = null;
          pendingNativeInputKey = null;
          count = 0; visualAnchor = null;
          clearShownCommand();
        },
      };
    },
    props: {
      handleKeyDown: (view, event) => {
        if (mode === "insert") {
          // IME composition — let the browser handle it
          if (event.isComposing) return false;

          // Insert-exit keys are handled exclusively by the document-level
          // captureEsc listener (already fired before we reach here).
          // If mode is still "insert" here, captureEsc did not handle it
          // (e.g. target was outside the editor), so handle as fallback.
          if (isInsertExit(event)) {
            event.preventDefault();
            exitToNormal(view);
            requestAnimationFrame(() => {
              if (mode === "normal" && document.activeElement !== view.dom) view.focus();
            });
            return true;
          }

          if (event.ctrlKey) { if (handleInsertCtrl(view, event)) { event.preventDefault(); return true; } }

          // Let the browser insert characters through NSTextInputClient (the
          // native WKWebView text-input path). Bypassing it via tr.insertText +
          // preventDefault causes WKWebView to treat the text as uncommitted;
          // when Escape is processed natively the content can be reverted.
          // ProseMirror's DOMObserver / handleTextInput picks up the DOM change.
          if (event.key === "Backspace" && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (lastInsertText.length > 0) lastInsertText = lastInsertText.slice(0, -1);
            return false;
          }
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) lastInsertText += event.key;
          return false;
        }
        // Let the platform clipboard handle copy/paste/cut/select-all so
        // content can be exchanged with other applications. Vim commands are
        // only handled for unmodified keys (and Ctrl+C remains Insert/Visual
        // mode's escape command).
        const clipboardKey = event.key.toLowerCase();
        const clipboardShortcut = ["c", "v", "x", "a"].includes(clipboardKey) &&
          (event.metaKey || (event.ctrlKey && clipboardKey !== "c"));
        // Copy/select-all are safe in read-only modes. Mutating clipboard
        // operations are delegated to the browser only while inserting;
        // Normal/Visual remain genuinely read-only (use Vim p/x for edits).
        if (clipboardShortcut && (clipboardKey === "c" || clipboardKey === "a")) return false;
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          pendingNativeInputKey = event.key;
        }
        event.preventDefault();
        if (mode === "visual" || mode === "visual-line") return handleVisual(view, event);
        showNormalKey(event);
        const handled = handleNormal(view, event);
        scheduleCommandClear();
        return handled;
      },
    },
  });
};
