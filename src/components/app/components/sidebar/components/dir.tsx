import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { CircleDot, FileIcon, FolderIcon } from "lucide-react";
import { TreeType } from "../../app.constants";
import { InlineCreateInput } from "./inline-create-input";
import { InlineRenameInput } from "./inline-rename-input";
import type { InlineCreate, InlineRename } from "../sidebar.presenter";
import { isIssueFile } from "@/features/issues/issues.types";

type Props = {
  tree: TreeType;
  onOpenFile: (file?: TreeType) => void;
  inlineCreate: InlineCreate;
  onCommitCreate: (name: string) => void;
  onCancelCreate: () => void;
  inlineRename: InlineRename;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
};

export const DirItem = ({ tree, onOpenFile, inlineCreate, onCommitCreate, onCancelCreate, inlineRename, onCommitRename, onCancelRename }: Props) => {
  const [localOpen, setLocalOpen] = useState(false);
  const isCreateTarget = inlineCreate?.parentId === tree.id;
  const isRenameTarget = inlineRename?.path === tree.path;

  return (
    <Collapsible
      className="group/collapsible"
      data-file-tree-directory
      data-tree-dir-id={tree.id}
      data-tree-dir-path={tree.path}
      open={isCreateTarget || localOpen}
      onOpenChange={setLocalOpen}
    >
      <SidebarMenuItem>
        {isRenameTarget ? (
          <div className="px-3">
            <InlineRenameInput
              initialName={tree.name}
              onCommit={onCommitRename}
              onCancel={onCancelRename}
            />
          </div>
        ) : (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              data-file-tree-item
              data-file-tree-directory-button="true"
              data-item-path={tree.path}
              data-item-name={tree.name}
              data-item-type="directory"
              className="text-xs cursor-pointer h-9 px-3 gap-2.5"
            >
              <FolderIcon className="size-4 shrink-0" />
              {tree.name}
            </SidebarMenuButton>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <SidebarMenuSub>
            {tree.children?.map((subTree) =>
              subTree.type === TreeType.FILE ? (
                <SidebarMenuSubItem key={subTree.id}>
                  {inlineRename?.path === subTree.path ? (
                    <InlineRenameInput
                      initialName={subTree.name}
                      onCommit={onCommitRename}
                      onCancel={onCancelRename}
                    />
                  ) : (
                    <SidebarMenuButton
                      data-file-tree-item
                      data-item-path={subTree.path}
                      data-item-name={subTree.name}
                      data-item-type="file"
                      className="text-xs cursor-pointer h-8 gap-2.5"
                      onClick={() => onOpenFile(subTree)}
                    >
                      {isIssueFile(subTree.name) ? <CircleDot className="size-4 shrink-0" /> : <FileIcon className="size-4 shrink-0" />}
                      {subTree.name}
                    </SidebarMenuButton>
                  )}
                </SidebarMenuSubItem>
              ) : (
                <DirItem
                  key={subTree.id}
                  onOpenFile={onOpenFile}
                  tree={subTree}
                  inlineCreate={inlineCreate}
                  onCommitCreate={onCommitCreate}
                  onCancelCreate={onCancelCreate}
                  inlineRename={inlineRename}
                  onCommitRename={onCommitRename}
                  onCancelRename={onCancelRename}
                />
              )
            )}
            {isCreateTarget && (
              <SidebarMenuSubItem>
                <InlineCreateInput onCommit={onCommitCreate} onCancel={onCancelCreate} />
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};
