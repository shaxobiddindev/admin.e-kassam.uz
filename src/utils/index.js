// Barcha sozlamalar config.js dan
export * from "../config";

// ── Enum tarjimalari ──────────────────────────────────────────
// Yagona manba: src/lib/ek-labels.js (packages/ui dan sinxronlanadi).
// Bu yerda faqat eski `{ label, color }` shakliga moslashtiruvchi qatlam bor,
// chunki `<Badge color="green">` shu nomlarni kutadi.
import {
  SHOP_STATUS as STATUS_DICT,
  ROLE as ROLE_DICT,
  ADMIN_ROLE as ADMIN_DICT,
  SHOP_PLAN as PLAN_DICT,
} from "../lib/ek-labels";

export {
  PAYMENT_TYPE, SALE_STATUS, INVENTORY_STATUS,
  entry, label, options,
  paymentLabel, paymentEntry, saleStatus, shopStatus, shopPlan,
  roleEntry, roleLabel, adminRole, inventoryState, rolesLabel,
} from "../lib/ek-labels";

/** tone → Badge rang nomi */
const TONE_COLOR = { success: "green", danger: "red", warning: "yellow", info: "blue", neutral: "gray" };

const withColor = (dict) =>
  Object.fromEntries(
    Object.entries(dict).map(([k, v]) => [k, { ...v, color: TONE_COLOR[v.tone] || "gray" }])
  );

/** ShopStatus — ACTIVE, BLOCKED, SUSPENDED, INACTIVE (+ DELETED) */
export const SHOP_STATUS = withColor(STATUS_DICT);

/** ShopPlan — FREE, BASIC, PREMIUM */
export const SHOP_PLAN = withColor(PLAN_DICT);

/** Do'kon xodimi rollari — faqat matn kerak */
export const ROLE_LABELS = Object.fromEntries(
  Object.entries(ROLE_DICT).map(([k, v]) => [k, v.short || v.label])
);
export const ROLE_OPTIONS = Object.keys(ROLE_DICT);

/** Tizim admini rollari — AdminRole enum'idagi TO'RTTA qiymat ham bor */
export const ADMIN_ROLE_LABELS = ADMIN_DICT;

// ── Admin-specific konstantalar ────────────────────────────────
export const STATUS_OPTIONS = ["ACTIVE", "BLOCKED", "SUSPENDED", "INACTIVE"];
