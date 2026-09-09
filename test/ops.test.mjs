/* ══════════════════════════════════════════════════════════════════════════
   TIZIM SOG'LIGI EKRANI: IKKITA QOIDA — sinov

   ═══ 1. «O'LCHANMAGAN» NOL EMAS ═════════════════════════════════════════

   Bo'sh javoblar ulushi hali to'planmagan bo'lishi mumkin — masalan RLS
   yoqilgan birinchi soatda, ya'ni AYNAN kerak bo'lgan paytda. O'shanda
   `0%` chiqarish «hammasi joyida» degan yolg'on xabar berardi va
   navbatchi qaytarish qarorini kechiktirardi.

   ═══ 2. NOMA'LUM TUR YASHIRILMAYDI ══════════════════════════════════════

   `ops_findings.kind` — enum emas, MATN ustuni. Backend yangi qo'riqchi
   qo'shsa, uning belgisi eski frontga ham keladi. Yorliq topilmasa
   qatorni yashirish — qo'riqchini ovozsiz qilish demak: u ishlaydi,
   ogohlantiradi va hech kim ko'rmaydi.

   ⚠ Serverdagi ro'yxatni bu yerdan ko'rib bo'lmaydi (boshqa repo),
   shuning uchun sinov ICHKI ziddiyatni ushlaydi: ma'lum turlarning
   yorlig'i uchala tilda ham bo'lishi shart.
   ══════════════════════════════════════════════════════════════════════════ */

import assert from "node:assert/strict";
import { sharePct, findingLabel, findingTone } from "../src/lib/ek-ops.js";
import { OPS_FINDING } from "../src/lib/ek-labels.js";
import { setLang } from "../src/lib/ek-i18n.js";
import LOCALES from "../src/lib/ek-locales.js";

let pass = 0;
const check = (name, fn) => {
  fn();
  pass++;
  console.log(`  ✅ ${name}`);
};

console.log("\n══ Tizim sog'ligi ekrani ══");

/* ── 1. O'lchanmagan ulush ───────────────────────────────────────────── */

check("o'lchanmagan ulush — chiziqcha, 0% EMAS", () => {
  assert.equal(sharePct(null), "—");
  assert.equal(sharePct(undefined), "—");
  assert.equal(sharePct("salom"), "—");
});

check("haqiqiy nol — 0.0%, chiziqcha emas", () => {
  /* ⚠ Nol ham MA'LUMOT: «o'lchandi va bo'sh javob bo'lmadi». */
  assert.equal(sharePct(0), "0.0%");
});

check("ulush foizga aylanadi", () => {
  assert.equal(sharePct(0.2), "20.0%");
  assert.equal(sharePct(0.0345), "3.5%");
  assert.equal(sharePct(1), "100.0%");
});

/* ── 2. Noma'lum tur ─────────────────────────────────────────────────── */

check("noma'lum tur XOM NOMI bilan chiqadi", () => {
  const raw = "KELAJAKDAGI_QORIQCHI";
  assert.equal(findingLabel(raw), raw,
    "noma'lum tur yashirilsa, yangi qo'riqchi ovozsiz qolardi");
  assert.equal(findingTone(raw), "warn",
    "noma'lum tur ham e'tiborni tortishi kerak");
});

check("ma'lum tur o'qiladigan nom bilan chiqadi", () => {
  const label = findingLabel("MISSING_UNIQUE_INDEX");
  assert.notEqual(label, "MISSING_UNIQUE_INDEX");
  assert.ok(label.length > 0);
});

/* ── 3. Uchala til ───────────────────────────────────────────────────── */

check("har bir turning yorlig'i uchala tilda ham bor", () => {
  const kinds = Object.keys(OPS_FINDING);
  assert.ok(kinds.length >= 5, "turlar ro'yxati bo'sh qolib ketgan");

  /* ⚠ `t()` GA QARAB BO'LMAYDI. Birinchi yozganimda shu sinov
     `findingLabel()` ni uchala tilda chaqirib, natijasi xom nomdan
     farq qilishini tekshirardi — va ruscha yorliqni O'CHIRIB
     TASHLAGANDA HAM O'TDI. Sabab: `t()` topilmagan kalitni standart
     tildan (uz) oladi, ya'ni ruscha panelda o'zbekcha matn chiqadi va
     sinov buni «bor» deb sanaydi.

     Shuning uchun bu yerda LUG'ATNING O'ZI qaraladi: kalit har bir
     tilda haqiqatan yozilganmi. */
  for (const lang of ["uz", "ru", "en"]) {
    const dict = LOCALES[lang];
    for (const kind of kinds) {
      const key = `enum.ops.${kind}`;
      assert.ok(Object.prototype.hasOwnProperty.call(dict, key),
        `${lang}: «${key}» yo'q — panelda boshqa tilning matni chiqardi`);
      assert.ok(String(dict[key]).trim().length > 0, `${lang}: «${key}» bo'sh`);
    }
  }
});

check("yorliq HAR TILDA o'sha tilning matni bo'ladi", () => {
  /* Yuqoridagi sinov kalit borligini tekshiradi; bu esa `t()` haqiqatan
     o'sha tildan olayotganini. */
  setLang("ru");
  assert.equal(findingLabel("RLS_EMPTY_PROBE"), LOCALES.ru["enum.ops.RLS_EMPTY_PROBE"]);
  setLang("en");
  assert.equal(findingLabel("RLS_EMPTY_PROBE"), LOCALES.en["enum.ops.RLS_EMPTY_PROBE"]);
  setLang("uz");
});

check("eng jiddiy ikkita tur QIZIL", () => {
  /* ⚠ Rang qaror qabul qilishga yordam beradi: himoya YO'Q va
     ma'lumot KO'RINMAYAPTI — ikkalasi ham darhol harakat talab
     qiladi, qolganlari esa kutishi mumkin. */
  assert.equal(findingTone("MISSING_UNIQUE_INDEX"), "danger");
  assert.equal(findingTone("RLS_EMPTY_PROBE"), "danger");
});

console.log(`\n  ${pass} o'tdi, 0 yiqildi\n`);
