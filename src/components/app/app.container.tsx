import { useAppFacade } from "./app.facade";
import { AppComponent } from "./app.component";

export const AppContainer = () => {
  const facade = useAppFacade();
  return <AppComponent {...facade} />;
};
