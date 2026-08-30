import type { TreeType } from "@/components/app/components/app.constants";
import { IssuesComponent } from "./issues.component";
import { useIssuesFacade } from "./issues.facade";
import { searchPathById } from "@/utils/search";
import { useParams } from "react-router-dom";

type Props = {
  trees: TreeType[];
  isVimMode?: boolean;
};

export const IssuesContainer = ({ trees, isVimMode }: Props) => {
  const { selectedId } = useParams<{ selectedId: string }>();
  const boardPath = selectedId ? searchPathById(selectedId, trees) : null;
  const facade = useIssuesFacade({ boardPath });
  return <IssuesComponent trees={trees} isVimMode={isVimMode} {...facade} />;
};
