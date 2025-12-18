import { useParams } from "react-router-dom";
import { TreeType } from "../components/app.constants";
import { useCallback, useEffect, useState } from "react";
import { searchPathById } from "@/utils/search";
type Props = {
  trees: TreeType[];
};
export const useEditorFacade = ({ trees }: Props) => {
  const { id } = useParams<{ id: string }>();
  const [initialContent, setInitialContent] = useState("");
  const [path, setPath] = useState<string | null>(null);

  const getContent = useCallback(() => {
    const path = searchPathById(id!, trees);
    if (!path) return null;
    window.api.readText(path).then((text) => {
      setInitialContent(text);
      setPath(path);
    });
  }, [trees, id]);

  useEffect(() => {
    getContent();
  }, [trees, getContent]);
  return { getContent, initialContent, path };
};
