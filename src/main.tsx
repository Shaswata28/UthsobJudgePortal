import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PortalProvider } from "./store";
import App from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <PortalProvider>
      <App />
    </PortalProvider>
  </BrowserRouter>,
);
