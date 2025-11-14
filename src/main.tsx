// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Elemento #root não encontrado no index.html");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

console.info("cfg", {
  base: import.meta.env.VITE_API_BASE_URL,
  scope: import.meta.env.VITE_API_SCOPE,
  auth: import.meta.env.VITE_AUTHORITY,
});