/* ══════════════════════════════════════════════════════════════════════════
   ADMIN PANELNING MIYASI (V75)

   ═══ NEGA ALOHIDA FAYL ══════════════════════════════════════════════════

   Panel uchta savolga javob beradi va uchalasi ham HISOB:

     • nima yomon? — ogohlantirishlar, muhimlik darajasi bo'yicha
     • nima o'zgardi? — o'tgan oyga nisbatan sezilarli farqlar
     • nima qilsa bo'ladi? — imkoniyatlar

   Bu hisoblar JSX ichida turganda ularni tekshirib bo'lmasdi. Shu sababli
   mantiq shu yerda — sof funksiyalar, React ham, tarjima ham yo'q.
   Funksiyalar KALIT qaytaradi, matnni sahifaning o'zi qo'yadi.

   ⚠ ILOVA (app) DAGI `ek-dash.js` NING NUSXASI EMAS. Tuzilishi bir xil,
   lekin ma'lumot butunlay boshqa: u do'konning savdosi haqida, bu esa
   BIZNING mijozlarimiz haqida. Umumiy qilib qo'yilganda har ikkala
   panelning qoidalari bir-birini cheklab qo'yardi.
   ══════════════════════════════════════════════════════════════════════════ */

export const SEVERITY = ["critical", "warning", "info"];

const RANK = { critical: 0, warning: 1, info: 2 };

/** Ogohlantirishlarni muhimlik, keyin SONI bo'yicha tartiblaydi. */
export function sortAlerts(list) {
  return [...list].sort((a, b) => {
    const r = (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9);
    if (r) return r;
    return (Number(b.weight ?? b.count) || 0) - (Number(a.weight ?? a.count) || 0);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   CHEGARALAR — hammasi bitta joyda
   ══════════════════════════════════════════════════════════════════════ */

export const T = {
  /** Zaxira shuncha soatdan eski bo'lsa — qizil. */
  backupHours: 26,
  /** «Nima o'zgardi» ga tushish uchun eng kichik farq (foizda). */
  changeMin: 10,
  /** Do'kon shuncha kun sotmasa — tashlab ketilgan deb hisoblanadi. */
  abandonDays: 30,
};

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ══════════════════════════════════════════════════════════════════════
   1. OGOHLANTIRISHLAR MARKAZI
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Butun tizimdan kelgan signallarni BITTA tartiblangan ro'yxatga yig'adi.
 *
 * Har bir satr: `{ id, severity, icon, key, args, count, to }`.
 *
 * ⚠ TARTIB PULGA EMAS, YO'QOTISH XAVFIGA qarab. Ilova panelida satrlar
 * summa bo'yicha tartiblanadi, chunki u yerda har satrning puli bor. Bu
 * yerda esa raqamlar turli o'lchovda: «3 ta ariza» va «5 ta bloklangan
 * do'kon» ni summa bilan taqqoslab bo'lmaydi. Shu sababli tartib
 * MUHIMLIK bilan qo'lda qo'yilgan va `weight` faqat bir xil muhimlik
 * ichida ishlaydi.
 *
 * ⚠ ZAXIRA HAMMA NARSADAN YUQORIDA. Bloklangan do'kon — bitta
 * mijozning muammosi; zaxirasiz bir kun esa BARCHA do'konlarning butun
 * savdo tarixini yo'qotish uchun yetarli.
 */
export function buildAlerts({ stats = null, backup = null, shops = [], users = [] } = {}) {
  const out = [];
  const s = stats || {};

  /* ── Tizimning o'zi ───────────────────────────────────────────────── */
  if (backup && (backup.stale || !backup.exists)) {
    out.push({
      id: "backup", severity: "critical", icon: "fa-database",
      key: backup.exists ? "adm.dash.attBackupStale" : "adm.dash.attBackupNever",
      args: { h: n(backup.hoursAgo) },
      count: backup.exists ? n(backup.hoursAgo) : null,
      weight: 1e9, to: "/settings",
    });
  }

  /* ── Pul ──────────────────────────────────────────────────────────── */
  const newRequests = n(s.newRequests);
  if (newRequests > 0) out.push({
    id: "requests", severity: "critical", icon: "fa-inbox",
    key: "adm.dash.attNewRequests", count: newRequests,
    weight: newRequests * 100, to: "/requests",
  });

  /* ⚠ «Tugagan» va «tugayotgan» ALOHIDA satr. Birinchisi allaqachon
     to'lamagan mijoz, ikkinchisi bugun to'lov kutadi — bular ikki xil
     suhbat va ikki xil shoshilinchlik. */
  if (n(s.expiredShops) > 0) out.push({
    id: "expired", severity: "critical", icon: "fa-circle-xmark",
    key: "adm.dash.attExpired", count: n(s.expiredShops),
    weight: n(s.expiredShops) * 10, to: "/shops",
  });
  if (n(s.expiringSoon) > 0) out.push({
    id: "expiring", severity: "warning", icon: "fa-hourglass-half",
    key: "adm.dash.attExpiring", count: n(s.expiringSoon),
    weight: n(s.expiringSoon) * 10, to: "/shops",
  });

  /* ── Mijoz holati ─────────────────────────────────────────────────── */
  if (n(s.abandonedShops) > 0) out.push({
    id: "abandoned", severity: "warning", icon: "fa-user-clock",
    key: "adm.dash.attAbandoned", args: { d: T.abandonDays },
    count: n(s.abandonedShops), weight: n(s.abandonedShops) * 5, to: "/shops",
  });
  if (n(s.neverSoldShops) > 0) out.push({
    id: "neverSold", severity: "info", icon: "fa-seedling",
    key: "adm.dash.attNeverSold", count: n(s.neverSoldShops),
    weight: n(s.neverSoldShops), to: "/shops",
  });

  /* ── Do'konlar ro'yxatidan ────────────────────────────────────────── */
  const blocked = shops.filter((x) => x.status === "BLOCKED").length;
  const suspended = shops.filter((x) => x.status === "SUSPENDED").length;
  const ownerless = shops.filter((x) => !x.ownerName).length;

  if (blocked) out.push({
    id: "blocked", severity: "critical", icon: "fa-ban",
    key: "adm.dash.attBlockedShops", count: blocked, weight: blocked, to: "/shops",
  });
  if (suspended) out.push({
    id: "suspended", severity: "warning", icon: "fa-pause",
    key: "adm.dash.attSuspended", count: suspended, weight: suspended, to: "/shops",
  });
  /* Egasiz do'kon — hech kim kira olmaydigan do'kon. */
  if (ownerless) out.push({
    id: "ownerless", severity: "warning", icon: "fa-user-slash",
    key: "adm.dash.attOwnerless", count: ownerless, weight: ownerless, to: "/shops",
  });

  const blockedUsers = users.filter((u) => !u.enabled).length;
  if (blockedUsers) out.push({
    id: "blockedUsers", severity: "info", icon: "fa-user-lock",
    key: "adm.dash.attBlockedUsers", count: blockedUsers, weight: blockedUsers, to: "/users",
  });

  return sortAlerts(out);
}

/** Muhimlik bo'yicha sanoq — `{ critical, warning, info }`. */
export function countBySeverity(alerts = []) {
  const c = { critical: 0, warning: 0, info: 0 };
  for (const a of alerts) if (c[a.severity] != null) c[a.severity]++;
  return c;
}

/* ══════════════════════════════════════════════════════════════════════
   2. «NIMA O'ZGARDI?»
   ══════════════════════════════════════════════════════════════════════ */

/** Foizdagi o'zgarish. Baza nol bo'lsa — `null` (cheksizlikni ko'rsatmaymiz). */
export function pctChange(now, prev) {
  const a = n(now), b = n(prev);
  if (b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

/* Qaysi ko'rsatkich kuzatiladi va o'sishi YAXSHIMI.
   ⚠ Bu yerda hammasining o'sishi yaxshi — admin panelida «kamayishi
   yaxshi» ko'rsatkich yo'q. Maydon baribir bor: keyinchalik
   «bekor qilingan obunalar» qo'shilsa, u teskari bo'ladi va uni
   ro'yxatga qo'shish bitta satr bo'lishi kerak. */
const METRICS = [
  { key: "activeShops", good: "up", now: (s) => s.activeShops30d, prev: (p) => p.activeShops },
  { key: "income",      good: "up", now: (s) => s.subscriptionIncome30d, prev: (p) => p.subscriptionIncome },
  { key: "sales",       good: "up", now: (s) => s.salesCount30d, prev: (p) => p.salesCount },
  { key: "newShops",    good: "up", now: (s) => s.newShops30d, prev: (p) => p.newShops },
];

/**
 * Joriy 30 kunni avvalgisi bilan taqqoslab, ENG SEZILARLI
 * o'zgarishlarni qaytaradi.
 *
 * ⚠ Chegara ikki tomonlama: farq `T.changeMin` foizdan katta bo'lishi
 * VA baza nolga teng bo'lmasligi kerak. Aks holda «yangi do'kon 0 dan
 * 1 ga chiqdi = +∞%» degan satr har oy ro'yxatning boshida turardi.
 */
export function changes(stats, limit = 3) {
  const prev = stats?.prev;
  if (!stats || !prev) return [];
  const out = [];
  for (const m of METRICS) {
    const a = n(m.now(stats)), b = n(m.prev(prev));
    if (a === b) continue;
    const p = pctChange(a, b);
    if (p == null || Math.abs(p) < T.changeMin) continue;
    out.push({
      key: m.key, pct: p, diff: a - b, now: a, prev: b,
      dir: p > 0 ? "up" : "down",
      tone: (p > 0) === (m.good === "up") ? "good" : "bad",
      weight: Math.abs(p),
    });
  }
  out.sort((x, y) => y.weight - x.weight);
  return out.slice(0, limit);
}

/* ══════════════════════════════════════════════════════════════════════
   3. VIDJETLAR — ko'rinishi va tartibi
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Paneldagi bloklar.
 *
 * ⚠ `perm` — bo'limni ochish ruxsati. Ilova panelidan farqi shu:
 * u yerda bo'linish ROL bo'yicha (pul ko'radimi yoki yo'q), bu yerda
 * esa RUXSAT bo'yicha, chunki admin huquqlari nozikroq bo'lingan
 * (`routes.js` dagi `can`).
 */
export const WIDGETS = [
  { id: "kpi",      key: "adm.dash.wKpi" },
  { id: "alerts",   key: "adm.dash.wAlerts" },
  { id: "income",   key: "adm.dash.wIncome" },
  { id: "changes",  key: "adm.dash.wChanges" },
  { id: "health",   key: "adm.dash.wHealth", perm: "SHOP_VIEW" },
  { id: "shops",    key: "adm.dash.wShops",  perm: "SHOP_VIEW" },
  { id: "requests", key: "adm.dash.wRequests", perm: "CONTACT_VIEW" },
  { id: "actions",  key: "adm.dash.wActions" },
];

/** Ruxsat etilgan bloklar. `has` — `(perm) => boolean`. */
export function allowedWidgets(has) {
  const ok = typeof has === "function" ? has : () => true;
  return WIDGETS.filter((w) => !w.perm || ok(w.perm));
}

const LS_KEY = "ek.admdash.layout.v1";

/**
 * Saqlangan tartib va ko'rinishni o'qiydi.
 *
 * ⚠ SAQLANGAN RO'YXAT HAQIQAT MANBAYI EMAS. Yangi versiyada blok
 * qo'shilsa, u eski ro'yxatda yo'q — shu sababli natija HAR DOIM
 * ruxsat etilganlar ro'yxatidan quriladi va saqlangan holat unga faqat
 * TARTIB va YASHIRISH sifatida qo'llanadi.
 */
export function readLayout(has, raw) {
  const all = allowedWidgets(has);
  let saved = null;
  try {
    saved = raw !== undefined ? raw
          : JSON.parse(localStorage.getItem(LS_KEY) || "null");
  } catch { saved = null; }

  const order = Array.isArray(saved?.order) ? saved.order : [];
  const hidden = new Set(Array.isArray(saved?.hidden) ? saved.hidden : []);
  const rank = new Map(order.map((id, i) => [id, i]));

  return all
    .map((w) => ({ ...w, on: !hidden.has(w.id) }))
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}

export function saveLayout(list) {
  const data = {
    order: list.map((w) => w.id),
    hidden: list.filter((w) => !w.on).map((w) => w.id),
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* xotira to'la */ }
  return data;
}

/** Blokni ro'yxatda bir pog'ona suradi. Chetdan chiqmaydi. */
export function move(list, id, dir) {
  const i = list.findIndex((w) => w.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function toggle(list, id) {
  return list.map((w) => (w.id === id ? { ...w, on: !w.on } : w));
}

/* ══════════════════════════════════════════════════════════════════════
   4. DO'KON SALOMATLIGI
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Do'konni to'rtta holatdan biriga ajratadi.
 *
 * ⚠ Bu ro'yxatni tartiblash uchun ham, ogohlantirish uchun ham
 * ishlatiladi — ikkalasi bir xil qoidaga bo'ysunishi shart. Ilgari
 * «tashlab ketilgan» tushunchasi umuman yo'q edi va yo'qotilgan mijoz
 * hech qayerda ko'rinmasdi.
 */
export function shopState(row, today = Date.now()) {
  if (!row) return "unknown";
  if (!row.lastSaleAt) return "never";
  if (n(row.salesCount30d) > 0) return "live";
  const days = (today - new Date(row.lastSaleAt).getTime()) / 864e5;
  return days >= T.abandonDays ? "abandoned" : "quiet";
}

export function stateTone(state) {
  if (state === "live") return "good";
  if (state === "quiet") return "warn";
  if (state === "abandoned") return "bad";
  return "info";
}

/**
 * Do'konlarni holat bo'yicha sanaydi.
 *
 * Qaytadi: `{ live, quiet, abandoned, never }`.
 */
export function healthCounts(rows = [], today = Date.now()) {
  const c = { live: 0, quiet: 0, abandoned: 0, never: 0 };
  for (const r of rows) {
    const st = shopState(r, today);
    if (c[st] != null) c[st]++;
  }
  return c;
}
