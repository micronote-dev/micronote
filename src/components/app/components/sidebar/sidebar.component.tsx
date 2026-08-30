import { CircleDot, FileIcon, KeyboardIcon, PlusIcon, SearchIcon } from "lucide-react";
import { InlineRenameInput } from "./components/inline-rename-input";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../../../ui/sidebar";
import { TreeType } from "../app.constants";
import { useEffect, useRef } from "react";
import { type Keybindings } from "@/lib/keybindings";
import { DirItem } from "./components/dir";
import { InlineCreateInput } from "./components/inline-create-input";
import { Button } from "@/components/ui/button";
import { useSidebarPresenter } from "./sidebar.presenter";
import { isIssueFile } from "@/features/issues/issues.types";
import { DeleteEntryDialog } from "./components/delete-entry-dialog.component";

type Props = {
  trees: TreeType[];
  onOpenSettings: () => void;
  onOpenDirectory: () => void;
  onSearch: () => void;
  onCreateEntry: (parentPath: string, name: string) => Promise<void>;
  onRenameEntry: (oldPath: string, newPath: string) => Promise<void>;
  onDeleteEntry: (path: string) => Promise<void>;
  onMoveEntry: (src: string, dst: string) => Promise<void>;
  onCopyEntry: (src: string, dst: string) => Promise<void>;
  focusRequest: number;
  createRequest: number;
  keybindings: Keybindings;
  onOpenFile: (file: TreeType) => void;
};

export const AppSidebar = ({ trees, onOpenSettings, onOpenDirectory, onSearch, onCreateEntry, onRenameEntry, onDeleteEntry, onMoveEntry, onCopyEntry, focusRequest, createRequest, keybindings, onOpenFile }: Props) => {
  const { cookedTrees, treeRef, handleTreeKeyDown, openFile, markTreeCursor, startInlineCreate, inlineCreate, commitCreate, cancelCreate, inlineRename, commitRename, cancelRename, pendingDelete, confirmDelete, cancelDelete } = useSidebarPresenter({ trees, keybindings, onCreateEntry, onRenameEntry, onDeleteEntry, onMoveEntry, onCopyEntry, onOpenFile });
  const handledCreateRequestRef = useRef(0);

  useEffect(() => {
    if (!focusRequest) return;
    // WKWebView schedules a native rAF to restore focus to the contenteditable
    // when it loses focus. Strategy:
    //   outer rAF  – focus tree (triggers focusout on contenteditable, which
    //                makes WKWebView queue its restoration rAF)
    //   inner rAF  – focus tree again (fires AFTER WKWebView's restoration rAF
    //                because it was queued later, so we win the race)
    // Both rAFs guard against the user entering insert mode in the window
    // between Space+E and the rAF firing, which would mean the keystroke was
    // accidental and we should not steal focus.
    const isEditorInsertMode = () =>
      !!document.querySelector('.milkdown-editor [data-vim-mode="insert"]');

    let innerRafId: number | null = null;
    const outerRafId = requestAnimationFrame(() => {
      if (isEditorInsertMode()) return;
      const item = treeRef.current?.querySelector<HTMLElement>("[data-file-tree-item]");
      item?.focus();
      innerRafId = requestAnimationFrame(() => {
        if (isEditorInsertMode()) return;
        item?.focus();
      });
    });
    return () => {
      cancelAnimationFrame(outerRafId);
      if (innerRafId !== null) cancelAnimationFrame(innerRafId);
    };
  }, [focusRequest, treeRef]);

  useEffect(() => {
    if (!createRequest || handledCreateRequestRef.current === createRequest) return;
    handledCreateRequestRef.current = createRequest;
    startInlineCreate();
  }, [createRequest, startInlineCreate]);

  return (
    <div className="relative h-full w-full ">
      <Sidebar collapsible="none" className="hidden-scrollbar w-full absolute pt-10">
        <SidebarHeader className="h-[52px] justify-center p-0  py-5">
          <div className="flex w-full items-center pr-2">
            <Button variant="ghost" size="icon-sm" onClick={onSearch}>
              <SearchIcon className="size-[18px]" />
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="icon-sm" onClick={startInlineCreate}>
                <PlusIcon className="size-[18px]" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Cheat sheet">
                <KeyboardIcon className="size-[18px]" />
              </Button>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent
          ref={treeRef}
          onKeyDown={handleTreeKeyDown}
          onFocusCapture={(event) => {
            const item = (event.target as HTMLElement).closest<HTMLElement>("[data-file-tree-item]");
            if (item) markTreeCursor(item);
          }}
          className="hidden-scrollbar"
        >
          <SidebarMenu className="hidden-scrollbar" aria-label="File tree">
            {cookedTrees.length === 0 ? (
              <SidebarMenuItem className="px-3 py-3 text-xs text-muted-foreground">
                <p>No files found</p>
                <Button
                  variant="link"
                  className="mt-1 h-auto p-0 text-xs"
                  onClick={onOpenDirectory}
                >
                  Choose folder
                </Button>
              </SidebarMenuItem>
            ) : (
              <>
                {cookedTrees.map((tree) =>
                  tree.type === TreeType.FILE ? (
                    <SidebarMenuItem key={tree.id}>
                      {inlineRename?.path === tree.path ? (
                        <InlineRenameInput
                          initialName={tree.name}
                          onCommit={commitRename}
                          onCancel={cancelRename}
                        />
                      ) : (
                        <SidebarMenuButton
                          data-file-tree-item
                          data-item-path={tree.path}
                          data-item-name={tree.name}
                          data-item-type="file"
                          className="text-xs cursor-pointer h-9 px-3 gap-2.5"
                          onClick={() => openFile(tree)}
                        >
                          {isIssueFile(tree.name) ? <CircleDot className="size-4 shrink-0" /> : <FileIcon className="size-4 shrink-0" />}
                          {tree.name}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ) : (
                    <DirItem
                      key={tree.id}
                      tree={tree}
                      onOpenFile={openFile}
                      inlineCreate={inlineCreate}
                      onCommitCreate={commitCreate}
                      onCancelCreate={cancelCreate}
                      inlineRename={inlineRename}
                      onCommitRename={commitRename}
                      onCancelRename={cancelRename}
                    />
                  )
                )}
                {inlineCreate?.parentId === null && (
                  <SidebarMenuItem>
                    <InlineCreateInput onCommit={commitCreate} onCancel={cancelCreate} />
                  </SidebarMenuItem>
                )}
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <DeleteEntryDialog
        target={pendingDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};
