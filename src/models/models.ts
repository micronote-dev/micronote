import { api } from "@/lib/bridge";

export const readDB = async () => ({ path: await api.getWorkspacePath() });
