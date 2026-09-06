/* ══════════════════════════════════════════════════════════════════════════
   ADMIN PANELNING MIYASI (V75)

   Bu yerda tekshiriladigan narsa — QAROR, ko'rinish emas. Panel o'nlab
   signalni bitta ro'yxatga yig'ib, ularni tartiblaydi va qaysi biri
   qizil bo'lishini hal qiladi. Xato jimgina bo'ladi: satr noto'g'ri
   joyda turadi yoki umuman chiqmaydi, ekran esa buzilmaydi.

   ⚠ ENG QIMMAT QOIDA — ZAXIRA HAMMA NARSADAN YUQORIDA. Bloklangan
   do'kon bitta mijozning muammosi; zaxirasiz bir kun esa BARCHA
   do'konlarning butun savdo tarixini yo'qotish uchun yetarli.

   Ishga tushirish:  node test/dash.test.mjs
   ══════════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import {
  buildAlerts, sortAlerts, countBySeverity, changes, pctChange,
  WIDGETS, allowedWidgets, readLayout, saveLayout, move, toggle,
  shopState, stateTone, healthCounts, T,
} from "../src/lib/ek-dash.js";

const LOCALES = (await import("../src/lib/ek-locales.js")).default
             ?? (await import("../src/lib/ek-locales.js"));

let pass = 0, fail = 0;
const it = (name, fn) => {
  try { fn(); pass++; console.log(`  ✅ ${name}`); }
  catch (e) { fail++; console.log(`  ❌ ${name}\n     ${e.message}`); }
};
const ids = (list) => list.map((a) => a.id);

/* ══════════════════════════════════════════════════════════════════
   OGOHLANTIRISHLAR
   ══════════════════════════════════════════════════════════════════ */
console.log("\n── Ogohlantirishlar markazi ──");

it("hammasi joyida bo'lsa ro'yxat BO'SH", () => {
  assert.deepEqual(buildAlerts({}), []);
  assert.deepEqual(buildAlerts({ stats: {}, backup: { exists: true, stale: false } }), []);
});

it("ZAXIRA hamma narsadan YUQORIDA turadi", () => {
  const a = buildAlerts({
    backup: { exists: true, stale: true, hoursAgo: 40 },
    stats: { newRequests: 99, expiredShops: 50 },
  });
  assert.equal(a[0].id, "backup",
    "zaxirasiz bir kun barcha do'konlarning tarixini yo'qotish uchun yetarli");
});

it("hech qachon olinmagan zaxira BOSHQA matn oladi", () => {
  const never = buildAlerts({ backup: { exists: false, stale: false } });
  assert.equal(never[0].key, "adm.dash.attBackupNever",
    "«40 soat oldin» va «hech qachon» bir xil yozilishi mumkin emas");
  const stale = buildAlerts({ backup: { exists: true, stale: true, hoursAgo: 40 } });
  assert.equal(stale[0].key, "adm.dash.attBackupStale");
  assert.equal(stale[0].args.h, 40);
});

it("qizil satrlar sariqlardan, sariqlar ko'klardan YUQORIDA", () => {
  const a = buildAlerts({
    stats: { newRequests: 1, expiringSoon: 2, neverSoldShops: 3 },
  });
  assert.deepEqual(a.map((x) => x.severity), ["critical", "warning", "info"]);
});

it("«tugagan» va «tugayotgan» obuna ALOHIDA satr", () => {
  const a = buildAlerts({ stats: { expiredShops: 3, expiringSoon: 5 } });
  const exp = a.find((x) => x.id === "expired");
  const soon = a.find((x) => x.id === "expiring");
  assert.equal(exp.severity, "critical", "allaqachon to'lamagan mijoz — qizil");
  assert.equal(soon.severity, "warning", "bugun to'lov kutayotgani — sariq");
  assert.ok(ids(a).indexOf("expired") < ids(a).indexOf("expiring"));
});

it("TASHLAB KETILGAN va HECH SOTMAGAN ALOHIDA satr", () => {
  const a = buildAlerts({ stats: { abandonedShops: 4, neverSoldShops: 7 } });
  const lost = a.find((x) => x.id === "abandoned");
  const fresh = a.find((x) => x.id === "neverSold");
  assert.equal(lost.severity, "warning", "yo'qotilgan mijoz");
  assert.equal(fresh.severity, "info", "hali boshlamagan mijoz");
  assert.equal(lost.args.d, T.abandonDays, "necha kunligi matnda aytiladi");
});

it("do'konlar ro'yxatidan holatlar sanaladi", () => {
  const a = buildAlerts({ shops: [
    { status: "BLOCKED", ownerName: "A" },
    { status: "SUSPENDED", ownerName: "B" },
    { status: "ACTIVE", ownerName: null },
    { status: "ACTIVE", ownerName: "C" },
  ] });
  assert.equal(a.find((x) => x.id === "blocked").count, 1);
  assert.equal(a.find((x) => x.id === "suspended").count, 1);
  assert.equal(a.find((x) => x.id === "ownerless").count, 1,
    "egasiz do'kon — hech kim kira olmaydigan do'kon");
});

it("bloklangan xodimlar ALOHIDA bo'limga olib boradi", () => {
  const a = buildAlerts({ users: [{ enabled: false }, { enabled: true }] });
  const row = a.find((x) => x.id === "blockedUsers");
  assert.equal(row.count, 1);
  assert.equal(row.to, "/users");
});

it("bir xil muhimlikda OG'IRLIK bo'yicha tartiblanadi", () => {
  const a = buildAlerts({ stats: { newRequests: 2, expiredShops: 9 } });
  /* ⚠ Bu yerda tartib PULGA emas, og'irlikka qarab: raqamlar turli
     o'lchovda va ularni to'g'ridan-to'g'ri taqqoslab bo'lmaydi. */
  assert.deepEqual(ids(a), ["requests", "expired"],
    "ariza — yo'qotilgan pul, u bloklangan obunadan oldinroq");
});

it("muhimlik bo'yicha sanoq", () => {
  const c = countBySeverity(buildAlerts({
    stats: { newRequests: 1, expiringSoon: 1, neverSoldShops: 1 },
  }));
  assert.deepEqual(c, { critical: 1, warning: 1, info: 1 });
});

it("sortAlerts asl ro'yxatni O'ZGARTIRMAYDI", () => {
  const src = [{ id: "a", severity: "info" }, { id: "b", severity: "critical" }];
  assert.deepEqual(ids(sortAlerts(src)), ["b", "a"]);
  assert.deepEqual(ids(src), ["a", "b"], "manba tegilmasdan qolishi kerak");
});

/* ══════════════════════════════════════════════════════════════════
   NIMA O'ZGARDI
   ══════════════════════════════════════════════════════════════════ */
console.log("\n── Nima o'zgardi ──");

it("nol bazadan o'sish foizga aylanmaydi", () => {
  assert.equal(pctChange(5, 0), null, "«0 dan 1 ga = +∞%» satri har oy boshda turardi");
  assert.equal(pctChange(0, 4), -100);
  assert.equal(pctChange(6, 4), 50);
});

it("avvalgi davr bo'lmasa ro'yxat BO'SH", () => {
  assert.deepEqual(changes(null), []);
  assert.deepEqual(changes({ activeShops30d: 10 }), [],
    "`prev` yo'q — taqqoslash ham yo'q");
});

it("kichik farqlar ro'yxatga TUSHMAYDI", () => {
  const s = { activeShops30d: 21, subscriptionIncome30d: 100, salesCount30d: 100, newShops30d: 10,
              prev: { activeShops: 20, subscriptionIncome: 100, salesCount: 100, newShops: 10 } };
  assert.deepEqual(changes(s), [], `5% farq ${T.changeMin}% chegaradan past — shovqin`);
});

it("eng sezilarli o'zgarish birinchi turadi", () => {
  const s = { activeShops30d: 30, subscriptionIncome30d: 300, salesCount30d: 109, newShops30d: 10,
              prev: { activeShops: 20, subscriptionIncome: 100, salesCount: 100, newShops: 10 } };
  const c = changes(s);
  assert.equal(c[0].key, "income", "+200% eng katta o'zgarish");
  assert.equal(c[0].tone, "good");
  assert.equal(c.length, 2, "9% — chegaradan past, u tushmaydi");
});

it("chegaraning O'ZI ro'yxatga KIRADI", () => {
  /* ⚠ Chegara «shundan kam bo'lsa ko'rsatilmaydi» degani, ya'ni
     roppa-rosa 10% ko'rsatiladi. Bu ikki tomonlama o'qiladigan joy va
     kod bilan sinov bir xil o'qishi kerak. */
  const at = { activeShops30d: 110, subscriptionIncome30d: 100, salesCount30d: 100, newShops30d: 10,
               prev: { activeShops: 100, subscriptionIncome: 100, salesCount: 100, newShops: 10 } };
  assert.equal(changes(at).length, 1, `roppa-rosa ${T.changeMin}% ko'rsatiladi`);

  const below = { ...at, activeShops30d: 109 };
  assert.equal(changes(below).length, 0, "9% esa ko'rsatilmaydi");
});

it("pasayish YOMON deb belgilanadi", () => {
  const s = { activeShops30d: 10, subscriptionIncome30d: 100, salesCount30d: 100, newShops30d: 10,
              prev: { activeShops: 20, subscriptionIncome: 100, salesCount: 100, newShops: 10 } };
  const c = changes(s);
  assert.equal(c[0].key, "activeShops");
  assert.equal(c[0].tone, "bad", "faol do'konlar kamayishi — yomon");
  assert.equal(c[0].dir, "down");
});

it("ro'yxat uzunligi cheklangan", () => {
  const s = { activeShops30d: 40, subscriptionIncome30d: 400, salesCount30d: 400, newShops30d: 40,
              prev: { activeShops: 10, subscriptionIncome: 100, salesCount: 100, newShops: 10 } };
  assert.equal(changes(s, 2).length, 2, "uzun ro'yxat o'qilmaydi");
});

/* ══════════════════════════════════════════════════════════════════
   DO'KON SALOMATLIGI
   ══════════════════════════════════════════════════════════════════ */
console.log("\n── Do'kon holati ──");

const NOW = new Date("2026-06-15T12:00:00Z").getTime();
const daysAgo = (d) => new Date(NOW - d * 864e5).toISOString();

it("to'rtta holat farqlanadi", () => {
  assert.equal(shopState({ lastSaleAt: daysAgo(2), salesCount30d: 40 }, NOW), "live");
  assert.equal(shopState({ lastSaleAt: daysAgo(10), salesCount30d: 0 }, NOW), "quiet",
    "yaqinda sotgan, lekin oxirgi 30 kunlik sanoqqa tushmagan");
  assert.equal(shopState({ lastSaleAt: daysAgo(120), salesCount30d: 0 }, NOW), "abandoned");
  assert.equal(shopState({ lastSaleAt: null, salesCount30d: 0 }, NOW), "never");
});

it("HECH QACHON SOTMAGAN «tashlab ketilgan» EMAS", () => {
  /* ⚠ Biri yo'qotilgan mijoz, ikkinchisi hali boshlamagan mijoz.
     Yechimlari boshqa: biriga qo'ng'iroq qilish kerak, ikkinchisiga
     o'rgatish. */
  assert.notEqual(shopState({ lastSaleAt: null }, NOW),
                  shopState({ lastSaleAt: daysAgo(200), salesCount30d: 0 }, NOW));
});

it("holat rangga aylanadi", () => {
  assert.equal(stateTone("live"), "good");
  assert.equal(stateTone("quiet"), "warn");
  assert.equal(stateTone("abandoned"), "bad");
  assert.equal(stateTone("never"), "info");
});

it("holatlar sanaladi", () => {
  const c = healthCounts([
    { lastSaleAt: daysAgo(1), salesCount30d: 5 },
    { lastSaleAt: daysAgo(1), salesCount30d: 3 },
    { lastSaleAt: daysAgo(40), salesCount30d: 0 },
    { lastSaleAt: null, salesCount30d: 0 },
  ], NOW);
  assert.deepEqual(c, { live: 2, quiet: 0, abandoned: 1, never: 1 });
});

/* ══════════════════════════════════════════════════════════════════
   VIDJETLAR
   ══════════════════════════════════════════════════════════════════ */
console.log("\n── Vidjetlar ──");

it("ruxsati yo'q blok ro'yxatga KIRMAYDI", () => {
  const only = allowedWidgets((p) => p === "SHOP_VIEW");
  assert.ok(only.every((w) => !w.perm || w.perm === "SHOP_VIEW"));
  assert.ok(!only.some((w) => w.id === "requests"),
    "arizalarni ko'ra olmaydigan admin uchun blok ham chizilmaydi");
});

it("ruxsat noma'lum bo'lsa hammasi ko'rinadi", () => {
  assert.equal(allowedWidgets(null).length, WIDGETS.length);
  assert.equal(allowedWidgets(() => true).length, WIDGETS.length);
});

it("YANGI blok eski saqlangan tartibda ham KO'RINADI", () => {
  const list = readLayout(null, { order: ["alerts", "kpi"], hidden: [] });
  assert.equal(list.length, WIDGETS.length,
    "saqlangan ro'yxat haqiqat manbayi emas — yangi blok yo'qolmasligi kerak");
  assert.equal(list[0].id, "alerts");
  assert.equal(list[1].id, "kpi");
});

it("yashirilgan blok o'chiq, lekin ro'yxatda qoladi", () => {
  const list = readLayout(null, { order: [], hidden: ["income"] });
  assert.equal(list.find((w) => w.id === "income").on, false,
    "qayta yoqish uchun ro'yxatda turishi kerak");
});

it("buzuq saqlangan holat ekranni yiqitmaydi", () => {
  assert.equal(readLayout(null, "shalabalon").length, WIDGETS.length);
  assert.equal(readLayout(null, { order: 5, hidden: "yo'q" }).length, WIDGETS.length);
});

it("blokni surish chetdan chiqmaydi", () => {
  const list = readLayout(null, null);
  assert.equal(move(list, list[0].id, -1)[0].id, list[0].id);
  const last = list[list.length - 1].id;
  assert.equal(move(list, last, 1)[list.length - 1].id, last);
});

it("surish ikkita blokni ALMASHTIRADI", () => {
  const list = readLayout(null, null);
  const [a, b] = [list[0].id, list[1].id];
  const out = move(list, b, -1);
  assert.deepEqual([out[0].id, out[1].id], [b, a]);
});

it("saqlash tartib va yashirilganlarni yozadi", () => {
  const data = saveLayout(toggle(readLayout(null, null), "income"));
  assert.deepEqual(data.hidden, ["income"]);
  assert.equal(data.order.length, WIDGETS.length);
});

/* ══════════════════════════════════════════════════════════════════
   TARJIMA QAMROVI

   ⚠ Ogohlantirish matnlari `ek-dash.js` da KALIT sifatida tug'iladi,
   sahifada esa faqat `t(a.key)` turadi. Sahifadan kalit izlaydigan
   tekshiruv ularni ko'rmaydi — shuning uchun kalitlar funksiyaning
   O'ZIDAN olinadi. Ilova panelida aynan shu xato bo'lgan: yettita
   ogohlantirish tarjimasiz qolgan va ekranda kalitning o'zi chiqqan.
   ══════════════════════════════════════════════════════════════════ */
console.log("\n── Tarjima qamrovi ──");

const EVERY = {
  backup: { exists: true, stale: true, hoursAgo: 40 },
  stats: { newRequests: 1, expiredShops: 1, expiringSoon: 1,
           abandonedShops: 1, neverSoldShops: 1 },
  shops: [{ status: "BLOCKED", ownerName: "A" },
          { status: "SUSPENDED", ownerName: "B" },
          { status: "ACTIVE", ownerName: null }],
  users: [{ enabled: false }],
};

const emitted = new Set();
for (const a of buildAlerts(EVERY)) emitted.add(a.key);
emitted.add("adm.dash.attBackupNever");
for (const w of WIDGETS) emitted.add(w.key);
for (const m of ["activeShops", "income", "sales", "newShops"]) emitted.add(`adm.dash.chg.${m}`);
for (const st of ["live", "quiet", "abandoned", "never"]) emitted.add(`adm.dash.state.${st}`);

it("hamma ogohlantirish CHIQADI — sinov o'zi ham tekshiriladi", () => {
  assert.ok(buildAlerts(EVERY).length >= 9,
    "kamida to'qqizta satr kutilgan, kelgan: " + buildAlerts(EVERY).length);
});

for (const lang of ["uz", "ru", "en"]) {
  it(`${lang}: ek-dash chiqaradigan hamma kalit tarjima qilingan`, () => {
    const L = LOCALES[lang];
    assert.ok(L, `${lang} lug'ati topilmadi`);
    const miss = [...emitted].filter((k) => !(k in L));
    assert.deepEqual(miss, [], "tarjimasiz: " + miss.join(", "));
  });
}

it("o'rin egallovchilar uchala tilda ham bir xil", () => {
  const ph = (v) => [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const k of emitted) {
    assert.equal(ph(LOCALES.ru[k]), ph(LOCALES.uz[k]), `${k}: ru`);
    assert.equal(ph(LOCALES.en[k]), ph(LOCALES.uz[k]), `${k}: en`);
  }
});

console.log(`\n${fail ? "❌" : "✅"} admin dash: ${pass} o'tdi, ${fail} yiqildi\n`);
process.exit(fail ? 1 : 0);
