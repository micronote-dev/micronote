import { api } from "@/lib/bridge";

export interface Project {
  id: string;
  name: string;
}

export const setPath = async (val: string) => {
  await api.setWorkspacePath(val);
};

export const getPath = async () => {
  return { path: await api.getWorkspacePath() };
}

export const makePath = async (path: string) => {
  await api.writeText(path, "")
}

export const makeDir = async (path: string) => {
  await api.makeDir(path);
}
