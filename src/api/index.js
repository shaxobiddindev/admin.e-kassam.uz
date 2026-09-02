import { API_BASE as API, LOGIN_URL, getDeviceId } from "../config";
import { getLang, withLang } from "../lib/ek-i18n";

// Bir vaqtda bir nechta so'rov 401 olsa, refresh faqat bir marta yuborilsin
let refreshPromise = null;

async function tryRefreshToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refresh = localStorage.getItem("ek_refresh");
      if (!refresh || refresh === "null" || refresh === "undefined") return false;

      // `credentials: include` — refresh token httpOnly cookie'da keladi (05-AUTH.md)
      const res = await fetch(`${API}/auth/admin/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept":       "application/json",
          "X-Device-Id":  getDeviceId(),
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) return false;

      const json = await res.json().catch(() => ({}));
      if (!json.success || !json?.data?.accessToken) return false;

      localStorage.setItem("ek_token",   json.data.accessToken);
      localStorage.setItem("ek_refresh", json.data.refreshToken || refresh);
      return true;
    } catch (_) {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function forceLogout() {
  localStorage.clear();
  // Til kirish ekraniga ham o'tsin: originlar turli, localStorage bo'linmaydi
  window.location.replace(withLang(`${LOGIN_URL}?logged_out=1`));
  throw new Error("AUTH_FAILED");
}

async function req(path, options = {}, _retry = false) {
  const token = localStorage.getItem("ek_token");
  const { headers: extra, ...rest } = options;

  const res = await fetch(`${API}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type":    "application/json",
      // Backend xato xabarlari foydalanuvchi tilida kelsin
      "Accept-Language": getLang(),
      "X-Device-Id":     getDeviceId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra || {}),
    },
  });

  if (res.status === 401) {
    // Login/refresh ning o'zi 401 bersa — bu haqiqiy xato, qayta urinmaymiz
    if (path.includes("/auth/admin/login") || path.includes("/auth/admin/refresh")) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || `Xatolik ${res.status}`);
    }

    if (_retry) forceLogout();

    const refreshed = await tryRefreshToken();
    if (!refreshed) forceLogout();

    return req(path, options, true);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Xatolik ${res.status}`);
  return json;
}
const body = (data) => ({ body: JSON.stringify(data) });

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login:  (data) => req("/auth/admin/login", { method: "POST", ...body(data) }),
  me:     ()     => req("/auth/admin/me"),
  logout: ()     => req("/auth/admin/logout", {
    method: "POST",
    ...body({ refreshToken: localStorage.getItem("ek_refresh") || "" }),
  }),
};

// ── Do'konlar ───────────────────────────────────────────────────
export const shopApi = {
  getAll:  ()         => req("/superadmin/shops"),
  // Faollik kesimi: oxirgi sotuv sanasi va 30 kunlik tushum.
  // Do'kon ro'yxatidan ALOHIDA: ro'yxatni chizish uchun agregatsiya
  // kerak emas va uni har safar hisoblash bekorga bo'lardi.
  stats:   ()         => req("/superadmin/shops/stats"),
  // Obuna to'lovlari. `POST` — hozircha qo'lda qayd etish, lekin
  // so'rov shakli Payme/Click callback'i bilan bir xil (provider +
  // providerTransactionId), ya'ni shlyuz ulanganda o'zgarmaydi.
  payments:    (id)       => req(`/superadmin/shops/${id}/payments`),
  addPayment:  (id, data) => req(`/superadmin/shops/${id}/payments`, { method: "POST", ...body(data) }),
  getById: (id)       => req(`/superadmin/shops/${id}`),
  create:  (data)     => req("/superadmin/shops",       { method: "POST",   ...body(data) }),
  update:  (id, data) => req(`/superadmin/shops/${id}`, { method: "PUT",    ...body(data) }),
  delete:  (id)       => req(`/superadmin/shops/${id}`, { method: "DELETE" }),
  // ⚠ `PATCH /shops/{id}/status` QO'SHILMAYDI — backendda bunday endpoint
  // yo'q va hech qachon bo'lmagan. Holat `update` (PUT) orqali yuboriladi.
};

// ── Xizmat yo'nalishlari va interfeys modullari (V49) ───────────
/* Do'konda QAYSI BO'LIMLAR bo'lishi shu yerdan boshqariladi: yo'nalish
   standart to'plamni beradi, istisno esa uni bitta modul darajasida
   to'g'irlaydi.

   ⚠ Bu ROL EMAS. Rol — "shu odam qila oladimi", modul — "bu do'konda
   bunday ish umuman bormi". Modul yopilsa do'kon egasi ham kira olmaydi:
   server 403 qaytaradi (`ShopFeatureGuard`), ya'ni bu yerdagi ekran
   haqiqiy to'siqning ko'rinishi, o'zi emas. */
export const featureApi = {
  /* Mavjud yo'nalishlar va ular olib keladigan modullar.

     ⚠ Manzil `/superadmin/shops/...` OSTIDA va bu ataylab: backendda
     u `SuperAdminController` ichida yashaydi, ya'ni `/superadmin/**`
     xavfsizlik qoidasi bilan avtomatik himoyalanadi. Ro'yxatning
     o'zi do'konga bog'liq emas — statik katalog. */
  directions: ()  => req("/superadmin/shops/service-directions"),
  /** Do'konning modul holati — har biri uchun "nega shunday" bilan. */
  get:      (id)  => req(`/superadmin/shops/${id}/features`),
  /** Yo'nalishlarni belgilash. Bo'sh ro'yxat — "sozlanmagan" holatiga qaytish. */
  setDirections: (id, directions) =>
    req(`/superadmin/shops/${id}/directions`, { method: "PUT", ...body({ directions }) }),
  /* Bitta modulga qo'lda qaror.
     ⚠ `enabled: null` — istisnoni OLIB TASHLASH, ya'ni yo'nalish
     qoidasiga qaytish. `false` bilan adashtirmang: `false` majburan
     yopish degani. */
  override: (id, feature, enabled, note) =>
    req(`/superadmin/shops/${id}/features/${feature}`, { method: "PATCH", ...body({ enabled, note }) }),
};

// ── Admin hisoblari va ruxsatlar (V50) ──────────────────────────
/* ⚠ FAQAT BOSH ADMIN. Yo'lning o'zi serverda `SUPER_ADMIN` ga qamalgan
   va har bir amal `ADMIN_MANAGE` talab qiladi — o'sha ruxsat esa hech
   kimga BERILMAYDI. Ya'ni bu bo'limni ko'rsatish yoki yashirish
   qulaylik masalasi; haqiqiy to'siq serverda.

   ⚠ `changePass` parolni TANADA yuboradi, `?password=` da emas: manzil
   qatori server logiga, proksi logiga va brauzer tarixiga tushadi. */
export const adminApi = {
  getAll:      ()          => req("/superadmin/admins"),
  getById:     (id)        => req(`/superadmin/admins/${id}`),
  /** Tizimdagi barcha ruxsatlar + qaysilarini berish mumkinligi. */
  permissions: ()          => req("/superadmin/admins/permissions"),
  create:      (data)      => req("/superadmin/admins", { method: "POST", ...body(data) }),
  update:      (id, data)  => req(`/superadmin/admins/${id}`, { method: "PUT", ...body(data) }),
  setEnabled:  (id, value) => req(`/superadmin/admins/${id}/enabled?value=${value}`, { method: "PATCH" }),
  changePass:  (id, password) =>
    req(`/superadmin/admins/${id}/password`, { method: "PATCH", ...body({ password }) }),
  delete:      (id)        => req(`/superadmin/admins/${id}`, { method: "DELETE" }),
  /* Bitta ruxsat bo'yicha qaror.
     `allowed: null` — qarorni olib tashlash (rol tayanchiga qaytish). */
  setPermission: (id, permission, allowed) =>
    req(`/superadmin/admins/${id}/permissions`, { method: "PATCH", ...body({ permission, allowed }) }),
};

// ── Tiklash aloqalari: pochta va telefon (V27) ──────────────────
/* ⚠ Pochta — parolni tiklash KALITI. Uni o'zgartirish jurnalga tushadi
   va ESKI manzilga ogohlantirish yuboriladi (server tomonda). */
export const adminProfileApi = {
  get:    ()     => req("/auth/admin/profile"),
  update: (data) => req("/auth/admin/profile", { method: "PUT", ...body(data) }),
};

// ── Ikki bosqichli kirish — TOTP (V26) ──────────────────────────
/* ⚠ `confirm` javobidagi tiklash kodlari FAQAT SHU YERDA, bir marta
   keladi: bazada ularning xeshi turadi va qayta ko'rsatib bo'lmaydi. */
export const twoFactorApi = {
  status:  ()      => req("/auth/admin/2fa"),
  setup:   ()      => req("/auth/admin/2fa/setup",   { method: "POST" }),
  confirm: (code)  => req("/auth/admin/2fa/confirm", { method: "POST", ...body({ code }) }),
  disable: (code)  => req("/auth/admin/2fa/disable", { method: "POST", ...body({ code }) }),
  /* Kodlar begonaga tushgan bo'lsa — hammasini bekor qilib, yangisini
     olish. 2FA o'chirilmaydi: sir va telefondagi ilova o'z joyida qoladi. */
  regenerateCodes: (code) =>
    req("/auth/admin/2fa/recovery-codes", { method: "POST", ...body({ code }) }),
};

// ── Zaxira nusxa holati (V24) ───────────────────────────────────
/* ⚠ Zaxirani ILOVA olmaydi — uni serverdagi `ops/backup.sh` oladi va
   natijani `backup_runs` ga yozadi. Bu yerda faqat O'QISH: oxirgi
   TEKSHIRILGAN (tiklab ko'rilgan) nusxa qachon olingani. */
export const backupApi = {
  status: () => req("/superadmin/backups"),
};

// ── Foydalanuvchilar ────────────────────────────────────────────
export const userApi = {
  getAll:      ()               => req("/superadmin/users"),
  getByShop:   (shopId)         => req(`/superadmin/shops/${shopId}/users`),
  create:      (shopId, data)   => req(`/superadmin/shops/${shopId}/users`,              { method: "POST",  ...body(data) }),
  update:      (shopId, userId, data) => req(`/superadmin/shops/${shopId}/users/${userId}`, { method: "PUT",   ...body(data) }),
  changePass:  (shopId, userId, password) => req(`/superadmin/shops/${shopId}/users/${userId}/password`, { method: "PATCH", ...body({ password }) }),
  toggleBlock: (shopId, userId) => req(`/superadmin/shops/${shopId}/users/${userId}/toggle-block`, { method: "PATCH" }),
  delete:      (shopId, userId) => req(`/superadmin/shops/${shopId}/users/${userId}`,    { method: "DELETE" }),
};

// ── Arizalar (landing "Demo so'rash" formasi) ───────────────────
// Backend allaqachon tayyor edi (`POST /contact` ochiq, o'qish SUPER_ADMIN),
// lekin panelda unga BITTA ham chaqiruv yo'q edi: landingdan kelgan har bir
// lid bazaga tushib, hech kim o'qimasdi. 00-OVERVIEW.md ning asosiy mezoni —
// "landing → demo so'rash konversiyasi" — aynan shu yerda uzilardi.
/* ⚠ O'CHIRISH METODI YO'Q va qo'shilmaydi. Ariza — tashqi odamning izi;
   uni yo'q qilish imkoni «siz ariza bermagansiz» degan bahsni hal qilib
   bo'lmaydigan qiladi. Spam ro'yxatdan holat bilan yashiriladi. */
export const contactApi = {
  getAll:      ()   => req("/contact"),
  markHandled: (id) => req(`/contact/${id}/handled`, { method: "PATCH" }),
  setStatus:   (id, value) => req(`/contact/${id}/status?value=${value}`, { method: "PATCH" }),
};

// ── Audit jurnali — FAQAT O'QISH ────────────────────────────────
// Yozish/tahrirlash/o'chirish endpointi YO'Q va bo'lmasligi kerak:
// o'zgartirilishi mumkin bo'lgan jurnal audit bo'lishdan to'xtaydi.
export const auditApi = {
  search: (qs = "") => req(`/superadmin/audit${qs ? "?" + qs : ""}`),
};

/* ══════════════════════════════════════════════════════════════════════
   MIJOZLAR — ADMINGA FAQAT SON (V50)

   ⚠ BU BO'LIM ATAYLAB KAMAYTIRILDI. Ilgari bu yerda barcha do'konlar
   bo'ylab to'liq ro'yxat bor edi: ism, telefon raqami, qancha xarid
   qilgani — ustiga telefon bo'yicha butun tizim bo'ylab qidiruv ham.
   Ya'ni panelda istalgan odamning raqamini kiritib, uning qaysi
   do'konlarda qancha pul sarflaganini ko'rish mumkin edi.

   Mijoz o'z ismini va raqamini BIZGA emas, do'konga bergan; do'kon esa
   mijozlar bazasini o'z kassasiga ishonib topshirgan. Ikkala tomon ham
   bunga rozilik bermagan.

   ⚠ `getById` VA QIDIRUV OLIB TASHLANDI, maskalash bilan almashtirilmadi:
   maskalangan ro'yxat baribir "bu do'konda falon odam falon pul
   sarflagan" degan ma'lumotni saqlaydi. Ma'lumot javobda BO'LMASA, uni
   ochib ham bo'lmaydi.

   Qoladigani — do'kon bo'yicha SON. U obuna tarifini tekshirish uchun
   kerak va hech kimni tanitmaydi.
   ══════════════════════════════════════════════════════════════════════ */
export const customerApi = {
  /** Do'kon bo'yicha mijozlar soni. Shaxsiy ma'lumot qaytmaydi. */
  countsByShop: () => req("/superadmin/customers"),
};
