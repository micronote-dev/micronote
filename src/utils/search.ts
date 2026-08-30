import { TreeType } from "@/components/app/components/app.constants";

export function searchPathById(id: string, trees: TreeType[]):string|null {
  const dirs = trees.filter((tr) => tr.type === TreeType.DIR);
  const files = trees.filter((tr) => tr.type === TreeType.FILE);
  if (files.length > 0) {
    const target = files.find((tr) => tr.id === id);
    if (target) {
      return target.path;
    }
  }

  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    const path = searchPathById(id, dir.children || []);
    if (path) {
      return path;
    }
  }
  return null
}

export function searchDirById(id:string, trees:TreeType[]):string | null {
  const dirs = trees.filter((tr) => tr.type === TreeType.DIR);
  if (dirs.length > 0){
    const target = dirs.find((tr) => tr.id === id);
    if (target){
      return target.path
    }
  }

  for (let i=0;i<dirs.length; i++){
    const dir = dirs[i]
    const path = searchDirById(id, dir.children||[])
    if (path){
      return path
    }
  }
  return null
}

export function searchTreeById(id: string, trees: TreeType[]): TreeType | null {
  for (const tree of trees) {
    if (tree.id === id) return tree;
    const child = searchTreeById(id, tree.children ?? []);
    if (child) return child;
  }
  return null;
}
