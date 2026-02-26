export const API = "http://localhost:8080/api";

export const LOGO_URL = "/logo.png";

export const money = (n) =>
  new Intl.NumberFormat("uz-UZ").format(Number(n) || 0) + " so'm";

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("uz-UZ") : "—";

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("uz-UZ") : "—";

export const initials = (s = "") =>
  (s || "").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

export const confirmDelete = (name) =>
  window.confirm(`${name} ni o'chirishni tasdiqlaysizmi?`);

export const SHOP_STATUS = {
  ACTIVE:    { label: "Aktiv",         color: "green"  },
  BLOCKED:   { label: "Bloklangan",    color: "red"    },
  SUSPENDED: { label: "To'xtatilgan",  color: "yellow" },
  DELETED:   { label: "O'chirilgan",   color: "red"    },
};

export const ADMIN_ROLE_LABELS = {
  SUPER_ADMIN: { label: "Super Admin", color: "purple" },
  ADMIN:       { label: "Admin",       color: "blue"   },
};

export const ROLE_LABELS = {
  OWNER:       "Egasi",
  SHOP_ADMIN:  "Do'kon Admin",
  STOREKEEPER: "Omborchi",
  CASHIER:     "Kassir",
};

export const PAYMENT_LABELS = {
  CASH:  "💵 Naqd",
  CARD:  "💳 Karta",
  MIXED: "🔀 Aralash",
};

export const SALE_STATUS = {
  CREATED:   { label: "Yangi",      color: "blue"  },
  PAID:      { label: "To'langan",  color: "green" },
  CANCELLED: { label: "Bekor",      color: "red"   },
};

export const ROLE_OPTIONS = ["OWNER", "SHOP_ADMIN", "STOREKEEPER", "CASHIER"];
