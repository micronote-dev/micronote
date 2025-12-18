import { AppRouterProvider } from "@/router/router";
import { ResizableHandle, ResizablePanel } from "../ui/resizable";
import { useAppFacade } from "./app.facade";
import { DirSelectDialog } from "./components/dir-select-dialog/dir-select-dialog.components";
import { AppSidebar } from "./components/sidebar/sidebar.component";

export const AppContainer = () => {
  const { isPathSelectDialogOpen, setIsPathSelectDialogOpen, trees } = useAppFacade();
  return (
    <div className="flex w-full">
      <ResizablePanel defaultSize={20}>
        <AppSidebar trees={trees || []} />
      </ResizablePanel>
      <ResizableHandle className="bg-border hover:bg-primary/50" />
      <ResizablePanel defaultSize={80}>
        <div className="w-full h-svh">
          <AppRouterProvider trees={trees || []}/>
        </div>
      </ResizablePanel>
      <DirSelectDialog isOpen={isPathSelectDialogOpen} onClose={() => setIsPathSelectDialogOpen(false)} />
    </div>
  );
};
