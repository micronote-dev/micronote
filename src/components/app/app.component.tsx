import { AppRouterProvider } from "@/router/router";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable";
import { DirSelectDialogContainer } from "./components/dir-select-dialog/dir-select-dialog.container";
import { AppSidebar } from "./components/sidebar/sidebar.component";
import { SettingsDialog } from "./components/settings/settings-dialog.component";
import { StartScreen } from "./components/start-screen/start-screen.component";
import { SearchDialogComponent } from "./components/search-dialog/search-dialog.component";
import { useEffect, useRef } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppPresenter } from "./app.presenter";
import type { TreeType } from "./components/app.constants";
import { isIssueFile } from "@/features/issues/issues.types";
import { searchTreeById } from "@/utils/search";
import { AppErrorDialog } from "./components/app-error-dialog.component";

type Props = {
  trees: TreeType[] | null;
  treeError: string | null;
  fetchTrees: () => Promise<void>;
  createFile: (path: string) => Promise<void>;
  makeDir: (path: string) => Promise<void>;
  renameEntry: (oldPath: string, newPath: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  moveEntry: (src: string, dst: string) => Promise<void>;
  copyEntry: (src: string, dst: string) => Promise<void>;
  toggleFullscreen: () => Promise<void>;
};

export const AppComponent = (props: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isPathSelectDialogOpen,
    setIsPathSelectDialogOpen,
    isStartScreen,
    handleCreateEntry,
    handleRenameEntry,
    handleDeleteEntry,
    handleMoveEntry,
    handleCopyEntry,
    isVimMode,
    isSettingsOpen,
    setIsSettingsOpen,
    isSearchOpen,
    setIsSearchOpen,
    handleOpenFile,
    isSidebarCollapsed,
    sidebarFocusRequest,
    sidebarCreateRequest,
    keybindings,
    appError,
    dismissAppError,
  } = useAppPresenter(props);

  const { trees, treeError } = props;
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const shouldShowStartScreen = ["/", "/index.html"].includes(location.pathname);

  useEffect(() => {
    if (isSidebarCollapsed) {
      sidebarRef.current?.collapse();
    } else {
      sidebarRef.current?.expand();
    }
  }, [isSidebarCollapsed]);

  const openTreeFile = (file: TreeType) => {
    if (isIssueFile(file.name) && file.id) {
      navigate(`/issues/${file.id}/backlog`);
    } else if (file.id) {
      handleOpenFile(file.id);
    }
  };

  const openSearchResult = (id: string) => {
    const file = searchTreeById(id, trees ?? []);
    if (file) openTreeFile(file);
  };

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-svh w-full">
        <ResizablePanel
          ref={sidebarRef}
          defaultSize={20}
          minSize={10}
          collapsible
          collapsedSize={0}
        >
          <AppSidebar
            trees={trees || []}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenDirectory={() => setIsPathSelectDialogOpen(true)}
            onSearch={() => setIsSearchOpen(true)}
            onCreateEntry={handleCreateEntry}
            onRenameEntry={handleRenameEntry}
            onDeleteEntry={handleDeleteEntry}
            onMoveEntry={handleMoveEntry}
            onCopyEntry={handleCopyEntry}
            focusRequest={sidebarFocusRequest}
            createRequest={sidebarCreateRequest}
            keybindings={keybindings}
            onOpenFile={openTreeFile}
          />
        </ResizablePanel>
        <ResizableHandle className="bg-border hover:bg-primary/50" />
        <ResizablePanel defaultSize={80}>
          <div className="w-full h-svh">
            {shouldShowStartScreen ? (
              <StartScreen
                requiresDirectory={isStartScreen}
                onSelectDirectory={() => setIsPathSelectDialogOpen(true)}
              />
            ) : (
              <AppRouterProvider trees={trees || []} isVimMode={isVimMode} />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      {treeError && (
        <p role="alert" className="fixed bottom-4 right-4 z-50 max-w-md rounded-md bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-lg">
          {treeError}
        </p>
      )}
      <DirSelectDialogContainer
        isOpen={isPathSelectDialogOpen}
        onClose={() => setIsPathSelectDialogOpen(false)}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <SearchDialogComponent
        open={isSearchOpen}
        onOpenChange={(open) => { if (!open) setIsSearchOpen(false); }}
        trees={trees || []}
        onSelect={openSearchResult}
      />
      <AppErrorDialog message={appError} onDismiss={dismissAppError} />
    </>
  );
};
