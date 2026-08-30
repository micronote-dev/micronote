import { useParams } from "react-router-dom";
import { TreeType } from "../components/app.constants";
import { useMemo } from "react";
import { searchPathById } from "@/utils/search";
import { api } from "@/lib/bridge";
import useSWR from "swr";

type Props = {
  trees: TreeType[];
};

export const useEditorFacade = ({ trees }: Props) => {
  const { id } = useParams<{ id: string }>();

  const path = useMemo(
    () => (id ? searchPathById(id, trees) : null),
    [id, trees]
  );

  // null key disables fetching; SWR handles cancellation automatically.
  const { data: initialContent, mutate } = useSWR(path, api.readText, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const reload = async () => {
    // Read directly so Reload always bypasses any SWR/browser cache and then
    // replace the cached value used to initialize the editor.
    const freshContent = path ? await api.readText(path) : undefined;
    if (freshContent !== undefined) await mutate(freshContent, { revalidate: false });
  };

  return { initialContent, path, reload };
};
