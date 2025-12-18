import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { FileIcon, FolderIcon } from "lucide-react";
import { TreeType } from "../../app.constants";
import { Link } from "react-router-dom";

type Props = {
  tree: TreeType;
};

export const DirItem = ({ tree }: Props) => {
  return (
    <Collapsible className={`group/collapsible`}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="text-xs cursor-pointer">
            <FolderIcon className="mr-2" />
            {tree.name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {tree.children?.map((subTree) =>
              subTree.type === TreeType.FILE ? (
                <Link to={`/${subTree.id}`} key={subTree.id}>
                  <SidebarMenuSubItem
                    className="text-xs cursor-pointer flex items-center hover:bg-gray-100 rounded py-1"
                    id={subTree.id}
                  >
                    <FileIcon className="mr-2 w-4" />
                    {subTree.name}
                  </SidebarMenuSubItem>
                </Link>
              ) : (
                <DirItem tree={subTree} />
              )
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};
