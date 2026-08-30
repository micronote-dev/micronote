import type { TreeType } from "@/components/app/components/app.constants";
import { EditorContainer } from "@/components/app/editor/editor.container";
import { Route, Routes } from "react-router-dom";
import { IssuesContainer } from "@/features/issues/issues.container";

type Props = {
    trees: TreeType[];
    isVimMode?: boolean;
}

export const AppRouterProvider = ({ trees, isVimMode }: Props) => {
  return (
    <Routes>
      <Route path="/" />
      <Route path="/issues/:selectedId/*" element={<IssuesContainer trees={trees} isVimMode={isVimMode} />} />
      <Route path="/:id" element={<EditorContainer trees={trees} isVimMode={isVimMode} />} />
    </Routes>
  );
};
