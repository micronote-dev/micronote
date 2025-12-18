import { BrowserRouter } from "react-router-dom";
import "./App.css";
import { AppPage } from "./app/page";
import { init } from "./models/models";

function App() {
  init();
  return (
    <BrowserRouter>
      <AppPage />
    </BrowserRouter>
  );
}

export default App;
