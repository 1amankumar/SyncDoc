import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";

import {
  BlockProvider
} from "./context/BlockContext";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <BlockProvider>
      <App />
    </BlockProvider>
  </React.StrictMode>
);