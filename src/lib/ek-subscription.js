/* ══════════════════════════════════════════════════════════════════════════
   OBUNALAR — sof yordamchilar (V145, 2026-10-04)

   Egasi: «obunalarni admin to'liq boshqara olsin — xohlaganiga bepul yoki
   cheksiz obuna, uni bekor qilish». Bu fayl — sahifa va boshqaruv oynasi
   uchun hisob-kitob: qolgan kun, ro'yxat bo'limlari, yangi muddatni
   OLDINDAN ko'rsatish. React ham, brauzer ham yo'q:
   `node test/subscription.test.mjs` sinaydi.

   ⚠ YANGI MUDDAT SERVER QOIDASI BILAN BIR XIL: muddati tugamagan bo'lsa
   QOLGAN kunlar ustiga, tugagan bo'lsa bugundan; to'lovda oy = 30 kun.
   Oldindan ko'rsatilgan sana va saqlangandan keyingisi farq qilsa, admin
   tizimga ishonmay qo'yadi. Server: `SubscriptionService.grantDays`,
   `registerPayment`.
   ══════════════════════════════════════════════════════════════════════════ */

const DAY = 86400000;

/** Qolgan kun. `null` — cheksiz (muddat yo'q); manfiy — tugagan. */
export function daysLeft(expiresAt, now = Date.now()) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - now) / DAY);
}

export const isTrial = (r) => !r.plan || r.plan === "FREE";
export const isUnlimited = (r) => !r.planExpiresAt;

/**
 * Ro'yxat bo'limlari. Bitta do'kon bir nechtasiga tushishi mumkin
 * («Sinov» va «Tugayapti») — bo'limlar filtr, toifa emas.
 */
export const FILTERS = {
  all:       () => true,
  soon:      (r, now) => r.status === "ACTIVE" && !isUnlimited(r)
                         && daysLeft(r.planExpiresAt, now) >= 0 && daysLeft(r.planExpiresAt, now) <= 7,
  expired:   (r, now) => !isUnlimited(r) && daysLeft(r.planExpiresAt, now) < 0,
  suspended: (r) => r.status === "SUSPENDED" || r.status === "BLOCKED",
  trial:     (r) => isTrial(r) && !isUnlimited(r),
  paid:      (r) => !isTrial(r) && !isUnlimited(r),
  unlimited: (r) => isUnlimited(r),
};
export const FILTER_ORDER = ["all", "soon", "expired", "suspended", "trial", "paid", "unlimited"];

export function counts(rows, now = Date.now()) {
  const c = {};
  for (const k of FILTER_ORDER) c[k] = rows.filter((r) => FILTERS[k](r, now)).length;
  return c;
}

/**
 * Holat ohangi: rang YOLG'IZ signal emas (CLAUDE.md #6) — chaqiruvchi
 * yoniga matn ham qo'yadi.
 */
export function tone(r, now = Date.now()) {
  if (r.status === "SUSPENDED" || r.status === "BLOCKED") return "danger";
  if (isUnlimited(r)) return "success";
  const d = daysLeft(r.planExpiresAt, now);
  if (d < 0) return "danger";
  if (d <= 7) return "warning";
  return "neutral";
}

/** Qolgan muddat chizig'i (0..1): 30 kun va undan ko'pi — to'liq. */
export function fill(r, now = Date.now()) {
  if (isUnlimited(r)) return 1;
  const d = daysLeft(r.planExpiresAt, now);
  return Math.max(0, Math.min(1, d / 30));
}

/** Bepul muddatdan keyingi sana (server bilan bir xil qoida). */
export function afterGrant(expiresAt, days, now = Date.now()) {
  const cur = expiresAt ? new Date(expiresAt).getTime() : 0;
  return new Date(Math.max(cur, now) + days * DAY);
}

/** To'lovdan keyingi sana. Cheksiz obuna to'lovdan keyin ham cheksiz qoladi. */
export function afterPayment(r, months, now = Date.now()) {
  if (isUnlimited(r) && !isTrial(r)) return null;
  return afterGrant(r.planExpiresAt, months * 30, now);
}

/** Bepul muddat uchun tayyor tugmalar (kun). */
export const PERIODS = [7, 14, 30, 90, 180, 365];

/** Tarif narxi × oy; narx yo'q (kelishuv/sinov) — `null`. */
export function suggestedAmount(plans, plan, months) {
  const p = (plans || []).find((x) => x.plan === plan);
  return p?.monthlyPrice ? p.monthlyPrice * Math.max(1, Number(months) || 1) : null;
}

/** Tarif chegarasi: `-1` — cheksiz. */
export const limitOf = (plans, plan, key) => (plans || []).find((x) => x.plan === plan)?.[key];

/**
 * Tarix: hodisalar + V145 dan OLDINGI to'lovlar (ular uchun hodisa yozilmagan).
 * ⚠ Eski to'lovlar tashlab yuborilsa, tarix «obuna bo'shliqdan paydo bo'lgan»
 * deb ko'rinardi — admin esa aynan «qachon, qancha to'lagan» deb so'raydi.
 */
export function timeline(events = [], payments = []) {
  const withEvent = new Set(events.filter((e) => e.paymentId).map((e) => e.paymentId));
  const legacy = payments
    .filter((p) => !withEvent.has(p.id))
    .map((p) => ({
      id: `p${p.id}`, type: "PAYMENT", planAfter: p.plan, expiresAfter: p.coversUntil,
      amount: p.amount, days: p.periodMonths * 30, paymentId: p.id,
      actor: p.registeredBy, note: p.note, createdAt: p.paidAt, legacy: true,
    }));
  return [...events, ...legacy]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/** `YYYY-MM-DD` (mahalliy) — sana maydoni shu ko'rinishni kutadi. */
export function isoDay(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
