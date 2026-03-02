// Barcha sozlamalar config.js dan
export * from "../config";

// ── Admin-specific konstantalar ────────────────────────────────
export const ADMIN_ROLE_LABELS = {
  SUPER_ADMIN: { label: "Super Admin", icon: "fa-crown",        color: "purple" },
  ADMIN:       { label: "Admin",       icon: "fa-shield-halved", color: "blue"   },
};

export const SHOP_STATUS = {
  ACTIVE:   { label: "Faol",     color: "green" },
  INACTIVE: { label: "Nofaol",   color: "gray"  },
  DELETED:  { label: "O'chirilgan", color: "red" },
};

export const ROLE_LABELS = {
  OWNER:       "Egasi",
  SHOP_ADMIN:  "Do'kon admini",
  CASHIER:     "Kassir",
  STOREKEEPER: "Omborchi",
};

export const ROLE_OPTIONS = ["OWNER", "SHOP_ADMIN", "CASHIER", "STOREKEEPER"];
