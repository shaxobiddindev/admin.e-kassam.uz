/* ══════════════════════════════════════════════════════════════════════════
   JADVAL EKSPORTI — HAQIQIY .xlsx (2026-10-09) — sinov

   Ilgari «Excel» tugmasi CSV berardi: raqamlar matn bo'lib qolardi va
   ustunni jamlab bo'lmasdi. Endi `.xlsx` va bu sinov uchta narsani
   ushlaydi: son — son bo'lib qoladi, telefon/kod — matn, formula
   bilan boshlanadigan matn — zararsizlantiriladi.
   ══════════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { xlsxCell, xlsxRows } from "../src/utils/export.js";
import { buildXlsx } from "../src/lib/ek-xlsx.js";
import { collectPages, fileName } from "../src/lib/ek-table-xlsx.js";

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`  ✓ ${name}`); };

ok("son son bo'lib qoladi", () => {
  assert.equal(xlsxCell(1250000), 1250000);
  assert.equal(xlsxCell(0), 0);
  assert.equal(xlsxCell(NaN), "");
});

ok("pulga o'xshash matn songa aylanadi", () => {
  assert.equal(xlsxCell("1 250 000 so'm"), 1250000);
  assert.equal(xlsxCell("12,5"), 12.5);
  assert.equal(xlsxCell("-3"), -3);
});

ok("telefon, shtrix-kod, 0 bilan boshlanadigan kod — matn", () => {
  assert.equal(xlsxCell("+998901234567"), "+998901234567");
  assert.equal(xlsxCell("+998 90 123 45 67"), "+998 90 123 45 67");
  assert.equal(xlsxCell("4780000000017"), "4780000000017");
  assert.equal(xlsxCell("0012"), "0012");
});

ok("formula in'ektsiyasi zararsizlantiriladi", () => {
  assert.equal(xlsxCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
  assert.equal(xlsxCell("@cmd"), "'@cmd");
  assert.equal(xlsxCell("-abc"), "'-abc");
  assert.equal(xlsxCell("+HYPERLINK(1)"), "'+HYPERLINK(1)");
});

ok("bo'sh qiymatlar — bo'sh katak", () => {
  assert.equal(xlsxCell(null), "");
  assert.equal(xlsxCell(undefined), "");
});

ok("birinchi qator — qalin sarlavhalar", () => {
  const rows = xlsxRows(["Do'kon", "Summa"], [["A", "1 000"], ["B", 2]]);
  assert.deepEqual(rows[0], [{ v: "Do'kon", bold: true }, { v: "Summa", bold: true }]);
  assert.deepEqual(rows[1], ["A", 1000]);
  assert.deepEqual(rows[2], ["B", 2]);
});

ok("fayl ZIP (PK) bilan boshlanadi va bo'sh emas", () => {
  const bytes = buildXlsx([{ name: "test", rows: xlsxRows(["a"], [[1]]) }]);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.ok(bytes.length > 500);
});

ok("fayl nomida sana", () => {
  assert.equal(fileName("audit", new Date(2026, 9, 9)), "audit-2026-10-09");
});

const pages = async () => {
  /* Server `{content, total}` qaytaradi — 450 qator, 200 tadan. */
  const data = Array.from({ length: 450 }, (_, i) => i);
  const got = await collectPages(async (p, size) => ({
    content: data.slice(p * size, (p + 1) * size), total: data.length,
  }), { size: 200 });
  assert.equal(got.length, 450);
  const tooMany = await collectPages(async () => ({ content: [1], total: 30000 }), { size: 200, cap: 20000 });
  assert.equal(tooMany, null);
  n++; console.log("  ✓ hamma sahifa yig'iladi, cheklovdan oshsa null");
};
await pages();

console.log(`\nexport: ${n} ta sinov o'tdi`);
