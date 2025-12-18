import { getPath } from "@/models/path";
import { useEffect, useState } from "react";
import { TreeType } from "./components/app.constants";
import { makeUUID } from "@/utils/uuid";

export const useAppFacade = () => {
  const [isPathSelectDialogOpen, setIsPathSelectDialogOpen] = useState(false);
  const [trees, setTree] = useState<TreeType[] | null>(null);
    useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
 
  const getTree = async () => {
    getPath().then(({ path }) => {
      window.api.appBoot(path).then((res) => {
        const tr = res as TreeType[];
        function attachIds(trees: TreeType[]): TreeType[] {
          return trees?.map((tree) => {
            if (tree.type === TreeType.FILE) {
              return { ...tree, id: makeUUID() };
            }
            return { ...tree, id: makeUUID(), children: attachIds(tree.children || []) };
          });
        }

        setTree(attachIds(tr));
      });
    });
  };
  useEffect(() => {
    getTree();
  }, [isPathSelectDialogOpen]);
  return { isPathSelectDialogOpen, setIsPathSelectDialogOpen, trees };
};
