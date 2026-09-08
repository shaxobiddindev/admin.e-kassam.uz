/* ══════════════════════════════════════════════════════════════════════════
   YOZUVLAR SODDA BO'LSIN — tekshiruv.

   Do'kon egasining talabi: «tushuntirishlar, izohlar shunchalik sodda
   bo'lsinki, oddiy odam osongina tushunib olsin».

   ⚠ NEGA TEKSHIRUV KERAK. Yozuvni bir marta soddalashtirish oson;
   MURAKKAB BO'LIB QOLMASLIGI qiyin. Yangi maydon qo'shgan dasturchi
   izohni o'z tilida yozadi: uzun qo'shma gap, bosh harfli baqiriq,
   «⚠» belgisi. Bir yildan keyin panel yana o'qib bo'lmaydigan bo'ladi.

   ⚠ Bu ILOVADAGI `test/locale-simple.test.mjs` NING JUFTI. Qoidalar
   bir xil bo'lishi shart: ikkala yuzda bir xil yozuvlar turadi va
   ular bir joyda tuzatilib, boshqasida eskicha qolsa, foydalanuvchi
   ikki xil matn ko'rardi.

   Ishga tushirish:  node scripts/check-locales.mjs
   ══════════════════════════════════════════════════════════════════════════ */

import { readFileSync } from "node:fs";

const MAX_SENTENCE = 90;   // bitta gapning eng ko'p uzunligi
const MAX_TOTAL    = 180;  // butun yozuvning eng ko'p uzunligi

/* Yorliq (badge) — bitta so'z va bosh harf ataylab. */
const BADGES = new Set([
  "layout.superadmin", "badge.printTitle",
  "adm.shops.typeBranch", "adm.shops.typeMain", "adm.shops.planRequested",
]);

/* Qisqartmalar — baqiriq emas. Kirillchasi ham: «МХИК», «НДС», «ОФД». */
const ABBR = new RegExp(
  "\\b(QQS|MXIK|IKPU|PLU|SMS|QR|API|PDF|XML|JSON|CSV|URL|ID|TIN|INN|POS|USB|IP"
  + "|МХИК|ИКПУ|НДС|ОФД|СМС|ИНН|КПП)\\b", "g");

const src = readFileSync(new URL("../src/lib/ek-locales.js", import.meta.url), "utf8");
const rows = [...src.matchAll(/"([\w.]+)":\s*"((?:[^"\\]|\\.)*)"/g)];

const problems = [];
for (const [, key, raw] of rows) {
  const text = raw.replace(/\\u([0-9a-fA-F]{4})/g,
                           (_, h) => String.fromCharCode(parseInt(h, 16)));

  if (text.includes("⚠")) problems.push(`${key}: «⚠» ekranda ishlatilmaydi`);

  const sentences = text.split(/(?<=[.!?])\s+/).filter((x) => x.trim());
  const long = sentences.find((s) => s.length > MAX_SENTENCE);
  if (long) problems.push(`${key}: gap uzun (${long.length}) — ${long.slice(0, 60)}…`);
  if (text.length > MAX_TOTAL) problems.push(`${key}: yozuv uzun (${text.length})`);

  if (!BADGES.has(key) && text.trim().split(/\s+/).length > 2) {
    const shout = text.replace(ABBR, "")
                      .match(/\b[A-ZА-ЯЎҚҒҲ][A-ZА-ЯЎҚҒҲ'’ʻ]{3,}\b/g);
    if (shout) problems.push(`${key}: gap ichida baqiriq — ${shout.join(", ")}`);
  }
}

/* ══ TAKRORLANGAN KALIT (V105) ═══════════════════════════════════════
   ⚠ Obyekt literalida bir kalit ikki marta yozilsa, JavaScript XATO
   BERMAYDI — KEYINGISI oldingisini jimgina bosadi. Ya'ni tarjimon
   yozgan matn ekranga umuman chiqmaydi va buni bilishning yagona yo'li
   ekranga qarab, boshqa matn turganini payqash.

   ⚠ TEKSHIRUV TIL BLOKI BO'YICHA: bu faylda `uz`, `ru`, `en` uchta
   obyekt yonma-yon turadi, ya'ni har kalit tabiiy ravishda uch marta
   uchraydi. Butun fayl bo'yicha sanash har kalitni «takror» deb
   ko'rsatardi.

   Ilovada (`app`) shu tekshiruv 15 ta takrorni topdi, bu yerda 6 ta. */
const blocks = [...src.matchAll(/^const (uz|ru|en) = \{$/gm)];
for (let i = 0; i < blocks.length; i++) {
  const from = blocks[i].index;
  const to = i + 1 < blocks.length ? blocks[i + 1].index : src.length;
  const seen = new Map();
  for (const m of src.slice(from, to).matchAll(/^\s*"([\w.]+)"\s*:/gm)) {
    seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  }
  for (const [k, n] of seen) {
    if (n > 1) problems.push(`${blocks[i][1]}/${k}: kalit ${n} marta yozilgan `
                           + "— oldingisi jimgina o'ladi");
  }
}

if (problems.length) {
  /* «Murakkab» emas, «muammo»: bu ro'yxatga endi takrorlangan
     kalitlar ham tushadi va ular soddalik masalasi emas. */
  console.log(`❌ ${problems.length} ta muammo:\n`);
  for (const p of problems.slice(0, 30)) console.log("   " + p);
  if (problems.length > 30) console.log(`   … yana ${problems.length - 30} ta`);
  process.exit(1);
}
console.log(`✅ ${rows.length} ta yozuv tekshirildi — hammasi sodda`);
