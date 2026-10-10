import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";
import { BlockProvider } from "./context/BlockContext";
import { ToastProvider } from "./context/ToastContext";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <ToastProvider>
      <BlockProvider>
        <App />
      </BlockProvider>
    </ToastProvider>
  </React.StrictMode>
);