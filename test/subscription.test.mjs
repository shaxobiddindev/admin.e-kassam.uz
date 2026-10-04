/* ══════════════════════════════════════════════════════════════════════════
   OBUNALAR — hisob-kitob (V145)

   ⚠ NEGA SINOV. Boshqaruv oynasi saqlashdan OLDIN yangi sanani ko'rsatadi.
   U server hisobidan farq qilsa, admin «12-dekabr» ni ko'rib saqlaydi-yu,
   do'kon 15-noyabrda to'xtaydi. Ro'yxat bo'limlari ham shu yerda: «Tugayapti»
   cheksiz do'konni ko'rsatsa yoki tugaganini yashirsa, admin kerakli do'konga
   qo'ng'iroq qilmaydi.

   Ishga tushirish:  node test/subscription.test.mjs
   ══════════════════════════════════════════════════════════════════════════ */
const {
  daysLeft, FILTERS, counts, tone, fill, afterGrant, afterPayment, suggestedAmount, timeline, isoDay,
} = await import("../src/lib/ek-subscription.js");

let pass = 0, fail = 0;
const is = (cond, name, extra = "") => {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "\n     " + extra : ""}`); }
};
const eq = (got, want, name) =>
  is(JSON.stringify(got) === JSON.stringify(want), name, `olindi: ${JSON.stringify(got)}, kutilgan: ${JSON.stringify(want)}`);

const NOW = new Date("2026-10-04T12:00:00Z").getTime();
const D = 86400000;
const at = (days) => new Date(NOW + days * D).toISOString();

console.log("\n── Qolgan kun ──");
eq(daysLeft(null, NOW), null, "muddatsiz — cheksiz (null)");
eq(daysLeft(at(10), NOW), 10, "10 kun");
eq(daysLeft(at(-3), NOW), -3, "3 kun oldin tugagan");
eq(daysLeft(at(0.2), NOW), 1, "bugun kechqurun tugaydi — 1 kun (yuqoriga)");

console.log("\n── Ro'yxat bo'limlari ──");
const rows = [
  { id: 1, plan: "BASIC",   planExpiresAt: at(3),   status: "ACTIVE" },
  { id: 2, plan: "PREMIUM", planExpiresAt: null,    status: "ACTIVE" },
  { id: 3, plan: "FREE",    planExpiresAt: at(10),  status: "ACTIVE" },
  { id: 4, plan: "BASIC",   planExpiresAt: at(-5),  status: "SUSPENDED" },
  { id: 5, plan: "BASIC",   planExpiresAt: at(-1),  status: "ACTIVE" },
  { id: 6, plan: "BASIC",   planExpiresAt: at(40),  status: "BLOCKED" },
];
const ids = (k) => rows.filter((r) => FILTERS[k](r, NOW)).map((r) => r.id);
eq(ids("soon"), [1], "«Tugayapti» — faqat 0..7 kun va faol; cheksiz ham, tugagan ham emas");
eq(ids("expired"), [4, 5], "«Muddati o'tgan» — imtiyozdagi (5) ham");
eq(ids("suspended"), [4, 6], "«To'xtatilgan» — bloklangan ham");
eq(ids("trial"), [3], "«Sinov»");
eq(ids("paid"), [1, 4, 5, 6], "«Pullik» — muddatli pullik tariflar");
eq(ids("unlimited"), [2], "«Cheksiz»");
eq(counts(rows, NOW).all, 6, "hisoblagich");

console.log("\n── Ohang va chiziq ──");
eq(tone(rows[0], NOW), "warning", "3 kun — ogohlantirish");
eq(tone(rows[1], NOW), "success", "cheksiz — yashil");
eq(tone(rows[4], NOW), "danger", "tugagan — qizil");
eq(tone(rows[5], NOW), "danger", "bloklangan — muddat ko'p bo'lsa ham qizil");
eq(fill(rows[0], NOW), 0.1, "3/30");
eq(fill(rows[3], NOW), 0, "tugagan — bo'sh");
eq(fill(rows[1], NOW), 1, "cheksiz — to'la");

console.log("\n── Yangi muddat (server qoidasi) ──");
eq(afterGrant(at(10), 30, NOW).toISOString(), at(40), "⚠ qolgan 10 kun ustiga 30 — kunlar yo'qolmaydi");
eq(afterGrant(at(-5), 30, NOW).toISOString(), at(30), "tugagan — bugundan");
eq(afterGrant(null, 14, NOW).toISOString(), at(14), "muddat yo'q (sinov) — bugundan");
eq(afterPayment({ plan: "BASIC", planExpiresAt: at(5) }, 2, NOW).toISOString(), at(65), "to'lov: 2 oy = 60 kun");
eq(afterPayment({ plan: "PREMIUM", planExpiresAt: null }, 1, NOW), null, "⚠ cheksiz to'lovdan keyin ham cheksiz");

console.log("\n── Summa taklifi ──");
const plans = [{ plan: "BASIC", monthlyPrice: 240000 }, { plan: "ENTERPRISE", monthlyPrice: null }];
eq(suggestedAmount(plans, "BASIC", 3), 720000, "240 000 × 3");
eq(suggestedAmount(plans, "ENTERPRISE", 3), null, "kelishuv — taklif yo'q");

console.log("\n── Tarix ──");
{
  const events = [{ id: 9, type: "GRANT", createdAt: "2026-10-03T10:00:00Z" },
                  { id: 8, type: "PAYMENT", paymentId: 2, createdAt: "2026-10-01T10:00:00Z" }];
  const payments = [{ id: 2, plan: "BASIC", periodMonths: 1, paidAt: "2026-10-01T10:00:00Z" },
                    { id: 1, plan: "BASIC", periodMonths: 1, amount: 240000, paidAt: "2026-08-01T10:00:00Z" }];
  const tl = timeline(events, payments);
  eq(tl.map((x) => x.id), [9, 8, "p1"], "⚠ V145 dan oldingi to'lov ham tarixda; hodisasi borlari takrorlanmaydi");
  eq(tl[2].legacy, true, "eski to'lov belgilangan");
}
eq(isoDay(new Date(2026, 0, 5)), "2026-01-05", "sana maydoni ko'rinishi");

console.log(`\n${pass} ✅ · ${fail} ❌`);
if (fail) process.exit(1);
