/* ==========================================================================
   e-Kassam — enum qiymatlari lug'ati

   Backend enum'lari (`uz.kassa.common.enums`) foydalanuvchiga HECH QACHON xom
   ko'rinishda chiqmaydi: `CASH` emas, `Naqd`. Yagona manba shu fayl —
   backendga yangi qiymat qo'shilsa, shu yerga ham qo'shiladi.

   ⚠ MATN BU YERDA TURMAYDI. Har bir yozuvning `label` i — `ek-i18n.js` dagi
   `enum.*` kalitiga bog'langan GETTER. Ya'ni til o'zgarganda mavjud
   obyektlar ham yangi tilni qaytaradi va hech qayerda "eski tildagi yorliq"
   qotib qolmaydi. Bu yerda faqat KO'RINISH metama'lumoti: tone, icon, color.

   Yorliq matnini `packages/ui/ek-locales.js` da tahrirlang.

   MANBA FAYL — packages/ui/ da tahrirlanadi, sync-tokens.ps1 tarqatadi.
   ========================================================================== */

import { t } from "./ek-i18n.js";

/**
 * Metama'lumot jadvalidan lug'at quradi: har bir kalitga `label` GETTER
 * qo'shiladi. Getter — spread (`{...entry}`) qilinganda qiymatga aylanadi,
 * shuning uchun modul darajasida spread qilmang, `entry()` ni chaqiring.
 */
function dict(prefix, meta) {
  const out = {};
  for (const [key, meta_] of Object.entries(meta)) {
    const { hasShort, ...visual } = meta_;
    out[key] = Object.defineProperties(visual, {
      label: { get: () => t(`${prefix}.${key}`), enumerable: true },
      ...(hasShort
        ? { short: { get: () => t(`${prefix}.${key}.short`), enumerable: true } }
        : {}),
    });
  }
  return out;
}

/* ── To'lov turi — uz.kassa.common.enums.PaymentType ─────────────────────── */
export const PAYMENT_TYPE = dict("enum.payment", {
  CASH:  { icon: "fa-money-bill-1",         color: "var(--ek-pay-cash)" },
  CARD:  { icon: "fa-credit-card",          color: "var(--ek-pay-card)" },
  CLICK: { icon: "fa-mobile-screen",        color: "var(--ek-role-stock)" },
  PAYME: { icon: "fa-mobile-screen-button", color: "var(--ek-role-cashier)" },
  MIXED: { icon: "fa-shuffle",              color: "var(--ek-pay-mixed)" },
  /* Nasiya — to'lov EMAS: kassaga pul tushmaydi, mijozning qarzi oshadi.
     Rang ogohlantirish rangida: kassir uni tasodifan tanlab qo'ymasin. */
  CREDIT:{ icon: "fa-hand-holding-dollar",  color: "var(--fg-warning)" },
});

/* ── Sotuv holati — SaleStatus ───────────────────────────────────────────── */
export const SALE_STATUS = dict("enum.sale", {
  CREATED:   { tone: "info",    icon: "fa-clock" },
  PAID:      { tone: "success", icon: "fa-circle-check" },
  /* ⚠ NASIYA CHEKI YASHIL EMAS (V46). Ilgari u ham `PAID` bo'lib, do'kon
     egasining ko'zi oldida yashil «To'langan» yozuvi turardi — holbuki
     kassaga bir tiyin tushmagan. Sariq: bu tugallanmagan ish. */
  CREDIT:    { tone: "warning", icon: "fa-hand-holding-dollar" },
  CANCELLED: { tone: "danger",  icon: "fa-circle-xmark" },
});

/* ══════════════════════════════════════════════════════════════════════════
   AUDIT JURNALI — AuditAction (V81)

   ═══ NEGA BU RO'YXAT SHU YERDA VA TO'LIQ ═══════════════════════════════

   Ilgari ro'yxat `AuditPage.jsx` ichida, RANG jadvalining o'zi edi:
   `const ACTIONS = Object.keys(TONE)`. Ya'ni amalning filtrga tushishi
   uning RANGI borligiga bog'liq edi va rangsiz amal filtrdan JIMGINA
   yo'qolardi.

   Natijasi: jadvalda 15 ta amal bor edi, serverda esa 51 ta. Qolgan
   36 tasi — jumladan `SALE_RETURN`, `CASH_MOVEMENT`, `TRANSFER_*` va
   hatto admin panelining O'Z amallari (`ADMIN_CREATE`,
   `ADMIN_PASSWORD_RESET`) — jurnalda ko'rinardi, lekin ularni
   TANLAB BO'LMASDI. Nazorat vositasi uchun bu eng yomon nosozlik
   turi: ma'lumot bor, lekin unga yetib bo'lmaydi.

   Endi ro'yxat TO'LIQ va rangdan MUSTAQIL. Rang — ixtiyoriy bezak
   (`color`), yo'qligi amalni ro'yxatdan chiqarmaydi.

   ⚠ HECH QANDAY YANGI MA'LUMOT OCHILMADI. Server bu qatorlarni
   allaqachon qaytarardi va sahifa ularni chizardi; qo'shilgani —
   yorliq va filtr.

   ⚠ IKKITA AMAL HALI YOZILMAYDI (`IMPERSONATE`, `PRICE_CHANGE`),
   lekin ro'yxatda TURADI: ular yozila boshlaganda birov shu faylni
   eslashi shart bo'lmasin — aynan shu unutish yuqoridagi nosozlikni
   keltirib chiqargan edi. Bo'sh natija — halol javob, filtrda
   yo'qlik esa yashirish.

   Rang qoidasi:
     red    — orqaga qaytmaydi yoki kassadan pul chiqaradi
     yellow — e'tibor talab qiladi, lekin odatiy ish bo'lishi mumkin
     green  — yaratish yoki pul kirishi
     blue   — yakunlangan ish
     (yo'q) — kulrang: oddiy o'zgarish
   ══════════════════════════════════════════════════════════════════════════ */
export const AUDIT_ACTION = dict("enum.audit", {
  /* ── Do'kon ── */
  SHOP_CREATE:            { color: "green",  icon: "fa-store" },
  SHOP_UPDATE:            { icon: "fa-store" },
  SHOP_DELETE:            { color: "red",    icon: "fa-store-slash" },
  SHOP_STATUS_CHANGE:     { color: "yellow", icon: "fa-toggle-on" },

  /* ── Xodim ── */
  USER_CREATE:            { color: "green",  icon: "fa-user-plus" },
  USER_UPDATE:            { icon: "fa-user-pen" },
  USER_DELETE:            { color: "red",    icon: "fa-user-minus" },
  USER_BLOCK:             { color: "red",    icon: "fa-user-lock" },
  USER_UNBLOCK:           { color: "green",  icon: "fa-user-check" },
  USER_PASSWORD_CHANGE:   { color: "yellow", icon: "fa-key" },

  /* ── Obuna va arizalar ── */
  PAYMENT_REGISTER:       { color: "green",  icon: "fa-money-check-dollar" },
  SUBSCRIPTION_EXPIRED:   { color: "red",    icon: "fa-hourglass-end" },
  CONTACT_HANDLED:        { color: "blue",   icon: "fa-envelope-open" },
  CONTACT_STATUS:         { color: "blue",   icon: "fa-envelope" },

  /* ── Admin paneli ── */
  ADMIN_LOGIN:            { icon: "fa-right-to-bracket" },
  /* ⚠ Hali yozilmaydi — sabab yuqoridagi izohda. */
  IMPERSONATE:            { color: "yellow", icon: "fa-user-secret" },
  ADMIN_CREATE:           { color: "green",  icon: "fa-user-shield" },
  ADMIN_UPDATE:           { icon: "fa-user-shield" },
  ADMIN_DELETE:           { color: "red",    icon: "fa-user-slash" },
  ADMIN_ENABLE:           { color: "green",  icon: "fa-toggle-on" },
  ADMIN_DISABLE:          { color: "yellow", icon: "fa-toggle-off" },
  ADMIN_PASSWORD_RESET:   { color: "yellow", icon: "fa-key" },

  /* ══ ⚠ IKKI BOSQICHLI KIRISH VA RUXSATLAR (V82) ═══════════════════
     Server bu beshtasini YOZADI, jadval esa ularni bilmasdi. Natija
     shu bo'lardi: qator jurnalda turadi, lekin filtrda tanlanmaydi —
     va bu faylning o'z qoidasi bo'yicha «ko'rinmaydigan amal = yo'q
     amal».

     ⚠ Aynan shu qatorlar bo'yicha savol beriladi: «kim 2FA ni
     o'chirdi?», «ruxsatni kim kengaytirdi?». Ular xavfsizlikka
     tegadi, shuning uchun rangi ham betaraf emas. */
  ADMIN_2FA_ENABLE:       { color: "green",  icon: "fa-shield-halved" },
  ADMIN_2FA_DISABLE:      { color: "red",    icon: "fa-shield-slash" },
  ADMIN_2FA_RECOVERY:     { color: "yellow", icon: "fa-life-ring" },
  ADMIN_2FA_RECOVERY_RESET: { color: "yellow", icon: "fa-arrows-rotate" },
  ADMIN_PERMISSION_CHANGE:  { color: "red",  icon: "fa-user-lock" },
  ANNOUNCEMENT_CHANGE:    { icon: "fa-bullhorn" },
  SHOP_DIRECTIONS_CHANGE: { icon: "fa-compass" },
  SHOP_FEATURE_CHANGE:    { icon: "fa-sliders" },

  /* ── Kassa va pul ──
     ⚠ `SALE_CANCEL` QIZIL, `SALE_RETURN` esa SARIQ. Ikkalasi ham pulga
     tegadi, lekin qaytarish — odatiy savdo hodisasi (tovar javonga
     qaytdi), bekor qilish esa `GuardedAction` izohida «eng ko'p
     suiiste'mol qilinadigan amal» deb belgilangan. */
  SALE_CANCEL:            { color: "red",    icon: "fa-ban" },
  SALE_RETURN:            { color: "yellow", icon: "fa-rotate-left" },
  /* ⚠ TUZATUVCHI CHEK — QIZIL, qaytarish kabi sariq emas.
     Qaytarish va bekor qilish MAVJUD chekka tayanadi: summa undan
     olinadi va oshirib bo'lmaydi. Tuzatishda esa summani ODAM
     yozadi — bu tizimdagi yagona joy, bir kishi hisobotdagi
     tushumni o'zi yozgan raqamga o'zgartira oladi. */
  SALE_CORRECTION:        { color: "red",    icon: "fa-file-pen" },
  CART_ABANDONED:         { color: "yellow", icon: "fa-cart-arrow-down" },
  SHIFT_CLOSE:            { color: "yellow", icon: "fa-lock" },
  CASH_MOVEMENT:          { color: "yellow", icon: "fa-money-bill-transfer" },
  STORE_SWITCH:           { color: "yellow", icon: "fa-shuffle" },
  /* Kassir smena ichida PIN bilan almashdi (V99) — `LOGIN` dan
     ATAYLAB ajratilgan: kassadagi kamomad tekshirilganda aynan shu
     farq kerak bo'ladi, kim kimni almashtirgani. */
  STAFF_PIN_SWITCH:       { color: "yellow", icon: "fa-user-clock" },
  STAFF_PIN_SET:          { color: "gray",   icon: "fa-key" },
  STAFF_PIN_CLEAR:        { color: "red",    icon: "fa-key" },

  /* ── Tovar ── */
  /* ⚠ QIZIL, garchi ko'pincha zararsiz bo'lsa ham. Tovar qoldiqsiz va
     sotuvsiz bo'lsa haqiqatan o'chiriladi; qolganda esa arxivga
     tushadi. Jurnalda ikkalasi bitta amal — chunki so'ragan odam
     uchun ular bitta harakat edi va u qaysi biri bo'lganini shu
     yerdan bilishi kerak. */
  PRODUCT_DELETE:         { color: "red",    icon: "fa-trash" },
  PRODUCT_CODE_ISSUE:     { color: "blue",   icon: "fa-tag" },
  PRODUCT_BARCODE_RELEASE:{ color: "yellow", icon: "fa-barcode" },
  PRODUCT_RESTORE:        { color: "green",  icon: "fa-rotate-left" },
  PRODUCT_BARCODE_ACTIVE_REPAIR: { color: "yellow", icon: "fa-wrench" },

  /* ── Narx ── */
  PRICE_CHANGE:           { color: "yellow", icon: "fa-tag" },
  PRICE_BULK_CHANGE:      { color: "yellow", icon: "fa-tags" },

  /* ── Ombor ── */
  STOCK_TAKE_CLOSE:       { color: "blue",   icon: "fa-clipboard-check" },
  STOCK_TAKE_CANCEL:      { color: "red",    icon: "fa-clipboard" },
  GOODS_RECEIPT:          { color: "green",  icon: "fa-truck-ramp-box" },
  TRANSFER_SEND:          { color: "blue",   icon: "fa-arrow-right-from-bracket" },
  TRANSFER_RECEIVE:       { color: "green",  icon: "fa-arrow-right-to-bracket" },
  TRANSFER_CANCEL:        { color: "red",    icon: "fa-xmark" },

  /* ── Xarajat va yetkazib beruvchi ── */
  EXPENSE_CREATE:         { color: "blue",   icon: "fa-receipt" },
  EXPENSE_DELETE:         { color: "red",    icon: "fa-trash" },
  SUPPLIER_PAYMENT:       { color: "blue",   icon: "fa-money-bill-wave" },

  /* ── Mijoz ── */
  CUSTOMER_DEBT_ADJUST:   { color: "yellow", icon: "fa-hand-holding-dollar" },
  /* ⚠ QIZIL: bu amal YASHIKDAN NAQD CHIQARADI (api V102). Do'kon
     jurnalida u allaqachon ajratib ko'rsatiladi; admin panelida esa
     nomsiz qolib ketgan edi. */
  CREDIT_PAYMENT_REVERSE: { color: "red",    icon: "fa-rotate-left" },
  CUSTOMER_ARCHIVE:       { icon: "fa-box-archive" },
  LOYALTY_TIER_CHANGE:    { icon: "fa-medal" },
  BONUS_SPEND:            { color: "blue",   icon: "fa-coins" },
  BONUS_ADJUST:           { color: "yellow", icon: "fa-coins" },
  BONUS_EXPIRE:           { icon: "fa-hourglass-end" },

  /* ── Sozlama va qurilma ── */
  SHOP_SETTING_CHANGE:    { icon: "fa-gear" },
  DEVICE_TRUSTED:         { icon: "fa-mobile-screen" },
  DEVICE_CONFIRMED:       { color: "green",  icon: "fa-mobile-screen-button" },
});

/* ── Ko'chirish holati — TransferStatus (V22) ────────────────────────────── */
export const TRANSFER_STATUS = dict("enum.transferStatus", {
  /* «Yo'lda» — ogohlantirish rangida: bu tugallanmagan ish. Tovar hech
     qaysi do'konning javonida yo'q va uni kimdir qabul qilishi kerak. */
  SENT:      { tone: "warning", icon: "fa-truck-fast" },
  RECEIVED:  { tone: "success", icon: "fa-circle-check" },
  CANCELLED: { tone: "neutral", icon: "fa-rotate-left" },
});

/* ── Do'kon holati — ShopStatus ──────────────────────────────────────────── */
export const SHOP_STATUS = dict("enum.shopStatus", {
  ACTIVE:    { tone: "success", icon: "fa-circle-check" },
  BLOCKED:   { tone: "danger",  icon: "fa-ban" },
  SUSPENDED: { tone: "warning", icon: "fa-pause" },
  INACTIVE:  { tone: "neutral", icon: "fa-circle-minus" },
  // Backend enum'ida yo'q, lekin API javobida uchraydi (yumshoq o'chirilgan)
  DELETED:   { tone: "neutral", icon: "fa-trash" },
});

/* ── Tarif — ShopPlan ────────────────────────────────────────────────────── */
export const SHOP_PLAN = dict("enum.plan", {
  FREE:       { tone: "neutral", icon: "fa-hourglass-half" },
  BASIC:      { tone: "info",    icon: "fa-store" },
  PREMIUM:    { tone: "success", icon: "fa-crown" },
  ENTERPRISE: { tone: "success", icon: "fa-building" },
});

/* ── To'lov provayderi — uz.kassa.common.enums.PaymentProvider ──────────── */
export const PAYMENT_PROVIDER = dict("enum.provider", {
  MANUAL: { icon: "fa-hand-holding-dollar", tone: "neutral" },
  PAYME:  { icon: "fa-mobile-screen-button", tone: "info" },
  CLICK:  { icon: "fa-mobile-screen",        tone: "info" },
});

/* ── Do'kon xodimi roli — RoleType ───────────────────────────────────────── */
export const ROLE = dict("enum.role", {
  OWNER:       { hasShort: true, color: "var(--ek-role-owner)",   bg: "var(--ek-role-owner-bg)" },
  SHOP_ADMIN:  { hasShort: true, color: "var(--ek-role-admin)",   bg: "var(--ek-role-admin-bg)" },
  CASHIER:     { hasShort: true, color: "var(--ek-role-cashier)", bg: "var(--ek-role-cashier-bg)" },
  STOREKEEPER: { hasShort: true, color: "var(--ek-role-stock)",   bg: "var(--ek-role-stock-bg)" },
});

/* ── Tizim admini — AdminRole ────────────────────────────────────────────── */
export const ADMIN_ROLE = dict("enum.adminRole", {
  SUPER_ADMIN:   { icon: "fa-crown",   color: "var(--ek-role-superadmin)", bg: "var(--ek-role-superadmin-bg)" },
  SYSTEM_ADMIN:  { icon: "fa-server",  color: "var(--ek-role-admin)",      bg: "var(--ek-role-admin-bg)" },
  SUPPORT_ADMIN: { icon: "fa-headset", color: "var(--ek-role-cashier)",    bg: "var(--ek-role-cashier-bg)" },
  AUDITOR:       { icon: "fa-magnifying-glass-chart", color: "var(--ek-role-stock)", bg: "var(--ek-role-stock-bg)" },
});

/* ── Ombor holati — InventoryStatus ──────────────────────────────────────── */
export const INVENTORY_STATUS = dict("enum.inventory", {
  ACTIVE:  { tone: "success", icon: "fa-circle-check" },
  EXPIRED: { tone: "danger",  icon: "fa-triangle-exclamation" },
});

/* ── O'lchov birligi — UnitOfMeasure ─────────────────────────────────────────
   `decimals` — nechta kasr xonasi ma'noli. Backend'dagi qiymat bilan BIR XIL
   bo'lishi shart: kassa miqdor maydonini shu raqamga qarab chizadi (DONA'da
   kasr umuman kiritilmaydi, KG'da uch xona). */
export const UNIT = dict("enum.unit", {
  DONA:       { decimals: 0, icon: "fa-cube" },
  QUTI:       { decimals: 0, icon: "fa-box" },
  QOP:        { decimals: 0, icon: "fa-bag-shopping" },
  JUFT:       { decimals: 0, icon: "fa-shoe-prints" },
  RULON:      { decimals: 0, icon: "fa-scroll" },
  TO_PLAM:    { decimals: 0, icon: "fa-boxes-stacked" },
  KG:         { decimals: 3, icon: "fa-weight-scale" },
  GRAM:       { decimals: 0, icon: "fa-weight-hanging" },
  LITR:       { decimals: 3, icon: "fa-bottle-droplet" },
  MILLILITR:  { decimals: 0, icon: "fa-flask" },
  METR:       { decimals: 2, icon: "fa-ruler" },
  METR_KV:    { decimals: 3, icon: "fa-vector-square" },
  METR_KUB:   { decimals: 3, icon: "fa-cube" },
  SOAT:       { decimals: 2, icon: "fa-clock" },
});

/* ── Tovar yoki xizmat — ProductType ─────────────────────────────────────── */
export const PRODUCT_TYPE = dict("enum.productType", {
  GOODS:   { icon: "fa-box",       tone: "neutral" },
  SERVICE: { icon: "fa-handshake", tone: "info" },
});

/* ── Markirovka guruhi — MarkingGroup ("Asl Belgisi") ────────────────────── */
export const MARKING_GROUP = dict("enum.marking", {
  TAMAKI:          { icon: "fa-smoking",         tone: "warning" },
  ALKOGOL:         { icon: "fa-wine-bottle",     tone: "warning" },
  PIVO:            { icon: "fa-beer-mug-empty",  tone: "warning" },
  SUV_ICHIMLIK:    { icon: "fa-bottle-water",    tone: "warning" },
  DORI:            { icon: "fa-pills",           tone: "warning" },
  TIBBIY_VOSITA:   { icon: "fa-kit-medical",     tone: "warning" },
  OYOQ_KIYIM:      { icon: "fa-shoe-prints",     tone: "warning" },
  MAISHIY_TEXNIKA: { icon: "fa-plug",            tone: "warning" },
  ZARGARLIK:       { icon: "fa-gem",             tone: "warning" },
  YOG_MOY:         { icon: "fa-oil-can",         tone: "warning" },
  BOSHQA:          { icon: "fa-barcode",         tone: "warning" },
});

/* ── Faoliyat turi — BusinessType ────────────────────────────────────────── */
export const BUSINESS_TYPE = dict("enum.business", {
  GROCERY:      { icon: "fa-basket-shopping" },
  CONSTRUCTION: { icon: "fa-trowel-bricks" },
  CLOTHING:     { icon: "fa-shirt" },
  COSMETICS:    { icon: "fa-pump-soap" },
  STATIONERY:   { icon: "fa-pen" },
  ELECTRONICS:  { icon: "fa-tv" },
  AUTO_PARTS:   { icon: "fa-car" },
  SERVICE:      { icon: "fa-handshake" },
  OTHER:        { icon: "fa-store" },
});

/* ── Global katalog holati — GlobalProductStatus ─────────────────────────── */
export const GLOBAL_STATUS = dict("enum.globalStatus", {
  PENDING:  { tone: "warning", icon: "fa-hourglass-half" },
  VERIFIED: { tone: "success", icon: "fa-circle-check" },
  REJECTED: { tone: "danger",  icon: "fa-circle-xmark" },
});

/* ==========================================================================
   Yordamchilar
   ========================================================================== */

/** Spring `ROLE_` prefiksi va katta-kichik harf farqini yo'qotadi. */
function normalize(value) {
  if (value == null) return "";
  const raw = typeof value === "object"
    ? (value.type || value.name || value.role || "")
    : String(value);
  return raw.trim().toUpperCase().replace(/^ROLE_/, "");
}

/**
 * Lug'atdan yozuvni oladi. Topilmasa `null` emas, **o'qiladigan** zaxira
 * qaytaradi: `PENDING_REVIEW` → `Pending review`. Foydalanuvchi hech qachon
 * `SNAKE_CASE` ko'rmaydi, hatto backend yangi qiymat qo'shsa ham.
 */
export function entry(d, value) {
  const key = normalize(value);
  if (!key) return { label: "—", tone: "neutral" };
  if (d[key]) return d[key];
  const readable = key.toLowerCase().replace(/_/g, " ");
  return { label: readable.charAt(0).toUpperCase() + readable.slice(1), tone: "neutral" };
}

/** Faqat matn kerak bo'lganda. */
export const label = (d, value) => entry(d, value).label;

/**
 * `<Select>` uchun tayyor ro'yxat: [{ value, label }].
 * ⚠ Natijani modul darajasida saqlab qo'ymang — til o'zgarsa eskiradi.
 * Har render'da qayta chaqiring (arzon).
 */
export const options = (d, only) =>
  (only || Object.keys(d)).map((k) => ({ value: k, label: d[k]?.label || k }));

/* Qulay qisqartmalar — chaqiruvchi kod lug'atni ikki marta yozmasin */
export const paymentLabel   = (v) => label(PAYMENT_TYPE, v);
export const paymentEntry   = (v) => entry(PAYMENT_TYPE, v);
export const saleStatus     = (v) => entry(SALE_STATUS, v);
export const transferStatus = (v) => entry(TRANSFER_STATUS, v);
export const shopStatus     = (v) => entry(SHOP_STATUS, v);
export const shopPlan       = (v) => entry(SHOP_PLAN, v);
export const paymentProvider= (v) => entry(PAYMENT_PROVIDER, v);
export const roleEntry      = (v) => entry(ROLE, v);
export const roleLabel      = (v) => entry(ROLE, v).label;
export const adminRole      = (v) => entry(ADMIN_ROLE, v);
export const inventoryState = (v) => entry(INVENTORY_STATUS, v);
export const unitEntry      = (v) => entry(UNIT, v);
export const unitLabel      = (v) => entry(UNIT, v).label;
export const productType    = (v) => entry(PRODUCT_TYPE, v);
export const markingGroup   = (v) => entry(MARKING_GROUP, v);
export const businessType   = (v) => entry(BUSINESS_TYPE, v);
export const globalStatus   = (v) => entry(GLOBAL_STATUS, v);

/**
 * Birlikdagi kasr xonalari soni.
 *
 * ⚠ Noma'lum birlik uchun 0 emas, 3 qaytariladi. Sabab: backend yangi
 * bo'linadigan birlik qo'shsa (masalan TONNA), eski front uni "butun son"
 * deb hisoblab kassirga 0.5 tonna sotishga yo'l bermay qo'yardi — ya'ni
 * xato SOTUVNI TO'SARDI. Ortiqcha aniqlik esa zararsiz: server baribir
 * o'z qoidasi bo'yicha yaxlitlaydi.
 */
export const unitDecimals = (v) => {
  const e = UNIT[normalize(v)];
  return e && typeof e.decimals === "number" ? e.decimals : 3;
};

/** Bir nechta rol kelganda (`user.roles` massivi) — vergul bilan. */
export const rolesLabel = (roles) =>
  (Array.isArray(roles) ? roles : [roles])
    .map((r) => entry(ROLE, r).label)
    .filter(Boolean)
    .join(", ") || "—";
