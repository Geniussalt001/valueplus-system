import React from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";
import "./styles/base.css";
import "./styles/effects.css";
import "./styles/red-white-theme.css";

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
