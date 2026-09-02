/* ══════════════════════════════════════════════════════════════════════════
   Marshrutlar va yon menyu — YAGONA MANBA

   Ilgari bu ma'lumot uch joyda takrorlanardi: `App.jsx` dagi `PAGES`,
   `Layout.jsx` dagi `NAV` va o'sha faylning `ICONS`/`TITLE_KEYS` lug'atlari.
   Yangi bo'lim qo'shilganda uchalasini ham yangilash kerak edi va bittasi
   unutilsa sahifa sarlavhasiz yoki menyusiz qolardi.

   ⚠ Yorliq EMAS, KALIT saqlanadi: yorliq har render'da `t()` dan olinadi,
   aks holda til almashtirilganda menyu eski tilda qolib ketardi.
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   RUXSAT (V50)

   Har bandda `perm` — o'sha bo'limni ochish uchun kerak bo'ladigan
   ruxsat. Ilgari menyu HAMMAGA bir xil chizilardi va auditor ham
   bosolmaydigan tugmalarni ko'rardi.

   ⚠ BU HIMOYA EMAS, QULAYLIK. Haqiqiy to'siq serverda
   (`AdminPermissionGuard`): bandni yashirish faqat foydalanuvchini
   bosolmaydigan joyga bosishdan qutqaradi. Shuning uchun `perm` siz
   band (Sozlamalar) hammaga ochiq qoladi — u o'z hisobining sozlamasi.

   ⚠ `permissions === null` — "hali noma'lum" (tarmoq uzilgan yoki eski
   backend). Bunda menyu TO'LIQ ko'rsatiladi: internet uzilgani uchun
   odamning bo'limlarini yashirish uni ishlay olmaydigan qilardi, ochiq
   qoldirish esa hech narsani ochmaydi.
   ══════════════════════════════════════════════════════════════════════════ */

/** Yon menyu tuzilishi. Tartib — ekranda ko'rinadigan tartib. */
export const NAV = [
  { sec: "nav.section.main", items: [
    { id: "dashboard", path: "/",          key: "nav.dashboard", icon: "fa-chart-pie",       perm: "SHOP_VIEW" },
    // Arizalar — Dashboard'dan keyin darhol: landingdan kelgan lid
    // javobsiz qolmasligi kerak, bu bo'lim ko'zga birinchi tushsin.
    { id: "requests",  path: "/requests",  key: "nav.requests",  icon: "fa-inbox",           perm: "CONTACT_VIEW" },
  ]},
  { sec: "nav.section.system", items: [
    { id: "shops",     path: "/shops",     key: "nav.shops",     icon: "fa-store",           perm: "SHOP_VIEW" },
    { id: "users",     path: "/users",     key: "nav.users",     icon: "fa-users",           perm: "SHOP_USER_VIEW" },
    { id: "customers", path: "/customers", key: "nav.customers", icon: "fa-address-book",    perm: "CUSTOMER_VIEW" },
    // Audit — tizim boshqaruvining oxirida: kundalik emas, lekin
    // kerak bo'lganda topilishi oson joyda.
    { id: "audit",     path: "/audit",     key: "nav.audit",     icon: "fa-clipboard-list",  perm: "AUDIT_VIEW" },
  ]},
  /* ⚠ ADMINLAR — ALOHIDA BO'LIM va u FAQAT bosh adminda ko'rinadi
     (`ADMIN_VIEW` hech kimga berilmaydi). Uni "Tizim boshqaruvi" ichiga
     qo'shish mumkin edi, lekin bu bo'lim boshqa toifadagi ish: qolgan
     hammasi mijozlarimiz haqida, bu esa BIZNING xodimlarimiz haqida. */
  { sec: "nav.section.access", items: [
    { id: "admins",    path: "/admins",    key: "nav.admins",    icon: "fa-user-shield",     perm: "ADMIN_VIEW" },
  ]},
  { sec: "nav.section.settings", items: [
    // `perm` YO'Q — o'z hisobingizning sozlamasi, har qanday adminga ochiq.
    { id: "settings",  path: "/settings",  key: "nav.settings",  icon: "fa-gear" },
  ]},
];

/** Barcha bo'limlar tekis ro'yxatda — marshrut jadvali va sarlavha uchun. */
export const NAV_ITEMS = NAV.flatMap((group) => group.items);

/**
 * Ruxsat bormi.
 *
 * @param permissions serverdan kelgan ro'yxat; `null` — hali noma'lum
 *                    (yuqoridagi izohga qarang) va bunda HAMMA narsa
 *                    ko'rinadi.
 */
export const can = (permissions, perm) =>
  !perm || !Array.isArray(permissions) || permissions.includes(perm);

/** Ko'rinadigan bandlar — bo'sh guruh umuman chizilmaydi. */
export const visibleNav = (permissions) =>
  NAV
    .map((group) => ({ ...group, items: group.items.filter((i) => can(permissions, i.perm)) }))
    .filter((group) => group.items.length > 0);

/**
 * Manzilga mos bo'limni topadi. Topilmasa `undefined` — chaqiruvchi tomon
 * "404" holatini o'zi hal qiladi, Dashboard'ga jimgina qaytarmaydi.
 */
export const navItemByPath = (pathname) =>
  NAV_ITEMS.find((item) => item.path === pathname);
