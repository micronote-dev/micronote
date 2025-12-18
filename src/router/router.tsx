import type { TreeType } from "@/components/app/components/app.constants";
import { EditorContainer } from "@/components/app/editor/editor.container";
import { Route, Routes } from "react-router-dom";

type Props = {
    trees: TreeType[];
}

export const AppRouterProvider = ({ trees }: Props) => {
  return (
    <Routes>
      <Route path="/" />
      <Route path="/:id" element={<EditorContainer trees={trees} />} />
    </Routes>
  );
};
