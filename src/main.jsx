import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// #region agent log
fetch("http://127.0.0.1:7287/ingest/33a6545c-95fa-4ea6-9ed7-b6eaf9d3be21", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9108f8" },
  body: JSON.stringify({
    sessionId: "9108f8",
    hypothesisId: "H1",
    location: "main.jsx:entry",
    message: "bundle executed; SPA shell should load",
    data: { path: typeof window !== "undefined" ? window.location.pathname : "" },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
