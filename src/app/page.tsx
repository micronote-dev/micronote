import { AppContainer } from "@/components/app/app.container";
import { ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";

export const AppPage = () => {
  return (
    <ResizablePanelGroup direction={"horizontal"}>
      <SidebarProvider>
        <AppContainer />
      </SidebarProvider>
    </ResizablePanelGroup>
  );
};
