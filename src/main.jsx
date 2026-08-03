import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initTheme } from "./lib/ek-theme";

// Tema — index.html dagi inline skript birinchi bo'yoqni to'g'ri qiladi,
// bu yerda tizim sozlamasi o'zgarishini kuzatish yoqiladi.
initTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
