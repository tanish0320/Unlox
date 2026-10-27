import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { RenderPage } from "./render/RenderPage";

const isRenderRoute =
  typeof window !== "undefined" &&
  (window.location.pathname === "/render" ||
    window.location.pathname.startsWith("/render/") ||
    new URLSearchParams(window.location.search).get("mode") === "render");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isRenderRoute ? <RenderPage /> : <App />}
  </React.StrictMode>
);
