/* ══════════════════════════════════════════════════════════════════════════
   XATO KUZATUVI — bosh admin paneli (A2, 2026-10-12, V163)

   Kassa ilovasidagi bilan bir xil (`ekassam-app/src/lib/ek-errors.js`):
   xato o'z serverimizga (`POST /client-errors`, tokensiz) boradi va bosh
   admin panelidagi «Ilova xatolari» da `app: "admin"` bilan ko'rinadi.
   Nima yuborilmasligi va sessiya chegarasi — `ek-errors-core.js` (o'sha
   faylning aynan nusxasi; o'zgartirilsa — uchala ilovada).

   ⚠ BU ILOVADA `ErrorBoundary` YO'Q: React 18 tutilmagan render xatosini
   `window` ning `error` hodisasiga chiqaradi, ya'ni u ham shu yerga keladi.
   ⚠ Versiya — BUILD VAQTI (`vite.config.js`, `__APP_VERSION__`): bu
   ilovaning `package.json` versiyasi o'zgarmaydi, deployni esa vaqt ajratadi.
   ══════════════════════════════════════════════════════════════════════════ */

import { API_BASE, getDeviceId } from "../config";
import { isNoise, classify, createGate, queuePush, queueTake, pathOnly } from "./ek-errors-core";

const APP = "admin";
const allow = createGate();
let installed = false;

// eslint-disable-next-line no-undef
const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

function session() {
  try {
    return { username: localStorage.getItem("ek_username") || undefined };
  } catch (_) { return {}; }
}

/** Xatoni yuborish. Hech qachon o'zi xato tashlamaydi. */
export function reportError(err, { kind = "error", componentStack } = {}) {
  try {
    const message = String(err?.message ?? err ?? "").slice(0, 500);
    const stack = typeof err?.stack === "string" ? err.stack : "";
    if (isNoise(err, message, stack)) return;
    if (!allow(kind + "|" + message + "|" + stack.split("\n")[1])) return;
    send({
      app: APP,
      platform: "web",
      version: VERSION,
      kind: classify(kind, message),
      message,
      stack: stack.slice(0, 8000),
      componentStack: componentStack ? String(componentStack).slice(0, 4000) : undefined,
      path: pathOnly(location.pathname),
      deviceId: getDeviceId(),
      ...session(),
    });
  } catch (_) { /* kuzatuvning o'zi yiqilmasin */ }
}

function send(payload) {
  if (navigator.onLine === false) return queuePush(localStorage, payload);
  fetch(`${API_BASE}/client-errors`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(
    (r) => { if (r.status >= 500) queuePush(localStorage, payload); },
    () => queuePush(localStorage, payload),
  );
}

function flush() {
  if (navigator.onLine === false) return;
  for (const p of queueTake(localStorage)) send(p);
}

/** Ilova ishga tushishida bir marta (`main.jsx`). */
export function installErrorReporting() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    if (e.target && e.target !== window) return;   // rasm/skript yuklanmadi — kod xatosi emas
    reportError(e.error || { message: e.message, stack: "" }, { kind: "error" });
  });
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, { kind: "rejection" }));
  window.addEventListener("online", flush);
  setTimeout(flush, 10_000);
}
