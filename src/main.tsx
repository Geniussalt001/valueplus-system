import React from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";
import "./styles/base.css";
import "./styles/effects.css";
/* Structural shell/layout rules; visual tokens are overridden by the active
   showcase and command-center themes loaded below. */
import "./styles/valueplus-modern-theme.css";
import "./styles/product-showcase.css";
import "./styles/showcase-system-theme.css";
import "./styles/doom-corporate-theme.css";
import "./styles/doom-workspace.css";

import App from "./App";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "ไม่พบ Element ที่มี id='root'",
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

