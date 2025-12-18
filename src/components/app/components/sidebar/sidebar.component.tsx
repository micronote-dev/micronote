import { FileIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem } from "../../../ui/sidebar";
import { TreeType } from "../app.constants";
import { useMemo } from "react";
import { DirItem } from "./components/dir";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = {
  trees: TreeType[];
};

export const AppSidebar = ({ trees }: Props) => {
  const cookedTrees = useMemo(() => {
    const dirs = trees.filter((tree) => tree.type === TreeType.DIR);
    const files = trees.filter((tree) => tree.type === TreeType.FILE);
    return [...dirs, ...files];
  }, [trees]);
  return (
    <div className="relative w-full">
      <Sidebar className="hidden-scrollbar w-full absolute">
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <Button variant={"ghost"}>
              <SearchIcon />
            </Button>
            <Button variant={"ghost"}>
              <PlusIcon />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 hidden-scrollbar">
          <SidebarMenu className="px-2 hidden-scrollbar">
            {cookedTrees?.map((tree) =>
              tree.type === TreeType.FILE ? (
                <Link to={`/${tree.id}`} key={tree.id}>
                  <SidebarMenuItem className="text-xs cursor-pointer flex items-center py-1" id={tree.id}>
                    <FileIcon className="mr-2 w-4" />
                    {tree.name}
                  </SidebarMenuItem>
                </Link>
              ) : (
                <DirItem tree={tree} />
              )
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </div>
  );
};
