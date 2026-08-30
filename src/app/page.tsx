import { AppContainer } from "@/components/app/app.container";
import { SidebarProvider } from "@/components/ui/sidebar";

export const AppPage = () => {
  return (
    <SidebarProvider>
      <AppContainer />
    </SidebarProvider>
  );
};
