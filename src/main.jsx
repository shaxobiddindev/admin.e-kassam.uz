import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initTheme } from "./lib/ek-theme";
import { initLang } from "./lib/ek-i18n";
import { installErrorReporting } from "./lib/ek-errors";

/* Xato kuzatuvi — HAMMADAN OLDIN: ishga tushishdagi xato ham yetib borsin. */
installErrorReporting();

// Tema — index.html dagi inline skript birinchi bo'yoqni to'g'ri qiladi,
// bu yerda tizim sozlamasi o'zgarishini kuzatish yoqiladi.
initTheme();

// Til — URL dagi `?lang=` (ilovalararo yo'naltirishdan) localStorage ga
// ko'chiriladi va <html lang> qo'yiladi. Faqat INTERFEYSGA ta'sir qiladi.
initLang();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
