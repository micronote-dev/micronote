import { getPath, makePath, makeDir as makeDirPath } from "@/models/path";
import { useCallback, useRef, useState } from "react";
import { TreeType } from "./components/app.constants";
import { makeUUID } from "@/utils/uuid";
import { api } from "@/lib/bridge";

export const useAppFacade = () => {
  const [trees, setTree] = useState<TreeType[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  // Stable path→UUID map so that UUIDs don't change across fetchTrees calls.
  // A rename changes the path and therefore gets a fresh UUID; all other
  // operations (create, delete, move into a different directory) preserve
  // the UUIDs of unaffected nodes, keeping open-editor routes valid.
  const pathToId = useRef<Record<string, string>>({});

  const fetchTrees = useCallback(async () => {
    setTreeError(null);
    try {
      const { path } = await getPath();
      if (!path) { setTree([]); return; }
      try {
        const res = await api.appBoot(path) as TreeType[];
        function attachIds(nodes: TreeType[]): TreeType[] {
          return nodes?.map((node) => {
            if (!pathToId.current[node.path]) {
              pathToId.current[node.path] = makeUUID();
            }
            const id = pathToId.current[node.path]!;
            if (node.type === TreeType.FILE) return { ...node, id };
            return { ...node, id, children: attachIds(node.children || []) };
          });
        }
        setTree(attachIds(res));
      } catch (error) {
        setTree([]);
        setTreeError(`Unable to read the selected folder: ${String(error)}`);
      }
    } catch (error) {
      setTree([]);
      setTreeError(`Unable to load workspace settings: ${String(error)}`);
    }
  }, []);

  const createFile = useCallback(async (path: string) => {
    await makePath(path);
  }, []);

  const makeDir = useCallback(async (path: string) => {
    await makeDirPath(path);
  }, []);

  const renameEntry = useCallback(async (oldPath: string, newPath: string) => {
    await api.renameEntry(oldPath, newPath);
  }, []);

  const deleteEntry = useCallback(async (path: string) => {
    await api.deleteEntry(path);
  }, []);

  const moveEntry = useCallback(async (src: string, dst: string) => {
    await api.moveEntry(src, dst);
  }, []);

  const copyEntry = useCallback(async (src: string, dst: string) => {
    await api.copyEntry(src, dst);
  }, []);

  return { trees, treeError, fetchTrees, createFile, makeDir, renameEntry, deleteEntry, moveEntry, copyEntry, toggleFullscreen: api.toggleFullscreen };
};
