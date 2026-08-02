// ╔══════════════════════════════════════════════════════════════╗
// ║           BARCHA URL VA SOZLAMALAR SHU YERDA               ║
// ║   Deployment uchun faqat DOMAIN ni o'zgartiring            ║
// ╚══════════════════════════════════════════════════════════════╝


// `npm run dev` → LOCALHOST, `npm run build` → PRODUCTION (avtomatik).
// Boshqa qiymat kerak bo'lsa .env faylida VITE_* ni bering.
const PROD = import.meta.env.PROD;

export const API_BASE  = import.meta.env.VITE_API_BASE
  ?? (PROD ? `https://api.e-kassam.uz/api` : `http://localhost:8080/api`);
export const LOGIN_URL = import.meta.env.VITE_LOGIN_URL
  ?? (PROD ? `https://auth.e-kassam.uz`    : `http://localhost:5175`);

// ── Logo (public/ papkasiga logo.png qo'ying) ──────────────────
export const LOGO_URL  = "/logo.png";

// ── localStorage kalitlari ─────────────────────────────────────
export const K = {
  token:    "ek_token",
  refresh:  "ek_refresh",
  type:     "ek_type",      // "admin" | "user"
  username: "ek_username",
  fullName: "ek_fullName",
  role:     "ek_role",
  shopCode: "ek_shopCode",
  deviceId: "ek_deviceId",
};

// ── Yordamchi funksiyalar ──────────────────────────────────────
export function getDeviceId() {
  let id = localStorage.getItem(K.deviceId);
  if (!id) {
    id = "web-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(K.deviceId, id);
  }
  return id;
}

export const money = (n) =>
  new Intl.NumberFormat("uz-UZ").format(Number(n) || 0) + " so'm";

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("uz-UZ") : "—";

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("uz-UZ") : "—";

export const initials = (s = "") =>
  (s || "").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
