/* ══════════════════════════════════════════════════════════════════════════
   DO'KON YOKI RESTORAN (2026-10-08) — `src/lib/ek-shop-kind.js`

   ⚠ ENG MUHIMI: restoran yo'nalishi yakka tanlanadi, do'konda ofitsiant
   va oshpaz taklif qilinmaydi, aralash eski joy restoran ro'yxatida
   «aralash» bo'lib chiqadi.

   Ishga tushirish:  node test/shop-kind.test.mjs
   ══════════════════════════════════════════════════════════════════════════ */
const K = await import("../src/lib/ek-shop-kind.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✅ " + m); } else { fail++; console.log("  ❌ " + m); } };

const store = { directions: ["RETAIL_FOOD"] };
const rest = { directions: ["RESTAURANT"] };
const mixed = { directions: ["UNIVERSAL", "RESTAURANT"] };
const bare = { directions: [] };

ok(!K.isRestaurant(store) && K.isRestaurant(rest) && K.isRestaurant(mixed) && !K.isRestaurant(bare) && !K.isRestaurant(null),
   "restoranmi — RESTAURANT yo'nalishi bo'yicha");
ok(K.isMixed(mixed) && !K.isMixed(rest) && !K.isMixed(store), "aralash — faqat restoran + boshqa");
{
  const all = [store, rest, mixed, bare];
  ok(K.ofKind(all, "store").length === 2 && K.ofKind(all, "restaurant").length === 2,
     "ro'yxat ikkiga bo'linadi — yo'nalishsiz joy do'konlarda");
}
{
  const t1 = K.toggleDirection(new Set(["RETAIL_FOOD", "PHARMACY"]), "RESTAURANT");
  ok(t1.size === 1 && t1.has("RESTAURANT"), "⚠ restoran bosilsa qolganlari tushadi");
  const t2 = K.toggleDirection(new Set(["UNIVERSAL", "RESTAURANT"]), "PHARMACY");
  ok(!t2.has("RESTAURANT") && t2.has("PHARMACY"), "do'kon yo'nalishi bosilsa restoran tushadi");
  const t3 = K.toggleDirection(new Set(["RESTAURANT"]), "RESTAURANT");
  ok(t3.size === 0, "qayta bosish — bekor qiladi");
}
{
  const roles = ["SHOP_ADMIN", "STOREKEEPER", "CASHIER", "WAITER", "COOK"];
  ok(K.rolesFor(store, roles).join() === "SHOP_ADMIN,STOREKEEPER,CASHIER", "⚠ do'konda ofitsiant va oshpaz yo'q");
  ok(K.rolesFor(rest, roles).length === 5, "restoranda hammasi");
  const t = (k) => (k === "enum.role.MANAGER" ? "Menejer" : k);
  const label = (r) => (r === "SHOP_ADMIN" ? "Do'kon admini" : r);
  ok(K.roleNameIn(rest, "SHOP_ADMIN", t, label) === "Menejer" && K.roleNameIn(store, "SHOP_ADMIN", t, label) === "Do'kon admini",
     "restoranda do'kon admini — «Menejer»");
}

console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} o'tdi, ${fail} yiqildi\n`);
process.exit(fail === 0 ? 0 : 1);
