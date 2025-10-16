import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import { App } from "./ui/App.js";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrimeReactProvider>
      <PrimeReactContext.Provider value={{}}>
        <App />
      </PrimeReactContext.Provider>
    </PrimeReactProvider>
  </StrictMode>
);
