import { api } from "@/lib/bridge";
import { mutate } from "swr";

const writeQueues = new Map<string, Promise<void>>();

export const saveMarkdown = async (path: string, markdown: string) => {
  const previous = writeQueues.get(path) ?? Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(() => api.writeText(path, markdown));
  writeQueues.set(path, write);

  try {
    await write;
    await mutate(path, markdown, { revalidate: false });
    window.dispatchEvent(new CustomEvent("micro-note:file-saved", { detail: { path } }));
  } finally {
    if (writeQueues.get(path) === write) writeQueues.delete(path);
  }
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";
