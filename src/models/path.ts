import { DB_PATH } from "./models";


export interface Project {
  id: string;
  name: string;
}

export const setPath = async (val: string) => {
  await window.api.writeJSON(DB_PATH, { path: val });
};

export const getPath = async ( ) => {
  const data = await window.api.readJSON(DB_PATH)
  return {path: data.path as string};
}
