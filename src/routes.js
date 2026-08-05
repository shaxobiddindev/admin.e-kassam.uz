/* ══════════════════════════════════════════════════════════════════════════
   Marshrutlar va yon menyu — YAGONA MANBA

   Ilgari bu ma'lumot uch joyda takrorlanardi: `App.jsx` dagi `PAGES`,
   `Layout.jsx` dagi `NAV` va o'sha faylning `ICONS`/`TITLE_KEYS` lug'atlari.
   Yangi bo'lim qo'shilganda uchalasini ham yangilash kerak edi va bittasi
   unutilsa sahifa sarlavhasiz yoki menyusiz qolardi.

   ⚠ Yorliq EMAS, KALIT saqlanadi: yorliq har render'da `t()` dan olinadi,
   aks holda til almashtirilganda menyu eski tilda qolib ketardi.
   ══════════════════════════════════════════════════════════════════════════ */

/** Yon menyu tuzilishi. Tartib — ekranda ko'rinadigan tartib. */
export const NAV = [
  { sec: "nav.section.main", items: [
    { id: "dashboard", path: "/",          key: "nav.dashboard", icon: "fa-chart-pie" },
    // Arizalar — Dashboard'dan keyin darhol: landingdan kelgan lid
    // javobsiz qolmasligi kerak, bu bo'lim ko'zga birinchi tushsin.
    { id: "requests",  path: "/requests",  key: "nav.requests",  icon: "fa-inbox" },
  ]},
  { sec: "nav.section.system", items: [
    { id: "shops",     path: "/shops",     key: "nav.shops",     icon: "fa-store" },
    { id: "users",     path: "/users",     key: "nav.users",     icon: "fa-users" },
    { id: "customers", path: "/customers", key: "nav.customers", icon: "fa-address-book" },
    // Audit — tizim boshqaruvining oxirida: kundalik emas, lekin
    // kerak bo'lganda topilishi oson joyda.
    { id: "audit",     path: "/audit",     key: "nav.audit",     icon: "fa-clipboard-list" },
  ]},
  { sec: "nav.section.settings", items: [
    { id: "settings",  path: "/settings",  key: "nav.settings",  icon: "fa-gear" },
  ]},
];

/** Barcha bo'limlar tekis ro'yxatda — marshrut jadvali va sarlavha uchun. */
export const NAV_ITEMS = NAV.flatMap((group) => group.items);

/**
 * Manzilga mos bo'limni topadi. Topilmasa `undefined` — chaqiruvchi tomon
 * "404" holatini o'zi hal qiladi, Dashboard'ga jimgina qaytarmaydi.
 */
export const navItemByPath = (pathname) =>
  NAV_ITEMS.find((item) => item.path === pathname);
