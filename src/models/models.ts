export const DB_PATH: string = (import.meta as ImportMeta).env?.VITE_DB_PATH ?? "./src/data/db.json";

export const init = async () => {
  const isExists = await window.api.existsJSON(DB_PATH);
  if (isExists) return;
  await window.api.writeJSON(DB_PATH, { path: ""});
};

export const readDB = async () => {
  const data = await window.api.readJSON(DB_PATH);
  return data;
}
