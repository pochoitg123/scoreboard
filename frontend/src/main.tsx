// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
/* Fuentes (de @fontsource) */
import "@fontsource-variable/outfit";    // peso variable
import "@fontsource/rajdhani/700.css";   // sólo bold para headings
import "@fontsource/jetbrains-mono";     // monospace para números

/* Global CSS */
import "./styles.css";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
