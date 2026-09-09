/* ══════════════════════════════════════════════════════════════════════════
   FORMATLASH — bitta tizim, bitta ko'rinish

   ═══ NEGA BU SINOV YOZILDI ════════════════════════════════════════════

   `ek-format.js` ham `ek-input.js` kabi UCHALA yuzga QO'LDA
   tarqatiladi va nusxalar jimgina ajralib ketadi. Ajralish topildi:

     · ilovada  `dateTime` → «02-08-2026 14:32»
     · adminda  `dateTime` → «02.08.2026 14:32»

   ⚠ VA BU LATENT EMAS EDI. Admin panelda `fmtDateTime` ni audit
   jurnali, katalog, ops, do'konlar va arizalar sahifasi chaqiradi.
   Ya'ni bitta panelda sana ikki xil ko'rinishda turgan: jadvalda
   nuqta bilan, sana maydonida esa chiziqcha bilan (`31-01-2026` —
   odam O'ZI shunday yozadi). V76 aynan shuni tuzatgan, tuzatish esa
   admin nusxasiga ko'chirilmagan.

   ⚠ SHUNING UCHUN ASOSIY BAND QATTIQ SATRNI SOLISHTIRMAYDI. U IKKI
   MODULNI solishtiradi: odam YOZGAN sana va jadvalda KO'RINGAN sana
   bir xil ajratgichda bo'lishi shart. Qattiq satr yozilganda
   ajratgich yana bir joyda o'zgarsa sinov «o'tib» ketardi.

   Ishga tushirish:  node test/format.test.mjs
   ══════════════════════════════════════════════════════════════════════════ */
import { dateTime, date, time, money, qty, percent, phone, initials, groupDigits }
  from "../src/lib/ek-format.js";
import { dateDisplayInput } from "../src/lib/ek-input.js";

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log("  ✅ " + m); };
const bad = (m, got) => { fail++; console.log("  ❌ " + m);
                          if (got !== undefined) console.log("     olindi: " + JSON.stringify(got)); };
const eq  = (actual, expected, msg) =>
  (actual === expected ? ok(msg) : bad(`${msg} (kutilgan: ${JSON.stringify(expected)})`, actual));

/* ⚠ Razryad ajratgichi — tor bo'shliq (U+202F), harfi bilan emas
   QOCHIRISH bilan yoziladi: u ekranda oddiy probeldan farq qilmaydi. */
const NNBSP = "\u202F";

const ISO = "2026-08-02T14:32:00";

console.log("\n═══ 1. ⚠ Sana ajratgichi — IKKI MODUL bir xil ═══");

{
  /* Odam maydonga «02082026» ni teradi — niqob nima chiqarsa,
     jadval ham AYNAN shu ajratgich bilan chiqarishi kerak. */
  const typed = dateDisplayInput("02082026");
  const shown = dateTime(ISO);
  eq(typed, "02-08-2026", "niqob: odam yozgan sana");
  shown.startsWith(typed)
    ? ok(`jadvaldagi sana niqob bilan bir xil boshlanadi («${shown}»)`)
    : bad(`jadval «${shown}», niqob «${typed}» — ikki xil ajratgich`, shown);
}

eq(dateTime(ISO), "02-08-2026 14:32", "sana+vaqt: chiziqcha, nuqta EMAS");
eq(time(ISO), "14:32", "faqat vaqt");

/* ⚠ Bo'sh va buzuq qiymat — «Invalid Date» EMAS, chiziqcha. Jadvalda
   «NaN.NaN.NaN» chiqishi ma'lumot yo'qolganday ko'rinardi. */
eq(dateTime(null), "—", "bo'sh sana — chiziqcha");
eq(dateTime("salom"), "—", "buzuq sana — chiziqcha, «Invalid Date» emas");
eq(date(null), "—", "bo'sh sana (qisqa ko'rinish) — chiziqcha");

console.log("\n═══ 2. Pul va son ═══");

eq(money(1234500), "1" + NNBSP + "234" + NNBSP + "500", "razryadlar tor bo'shliq bilan");
eq(groupDigits(1000), "1" + NNBSP + "000", "to'rt xonali son ham ajratiladi");
/* ⚠ Tiyin muomalada yo'q — pul BUTUN so'mga yaxlitlanadi. */
eq(money(999.6), "1" + NNBSP + "000", "pul butun so'mga yaxlitlanadi");
eq(money(null), "0", "bo'sh pul — nol, bo'sh satr emas");
eq(qty(1.25), "1.25", "miqdorda kasr qoladi");
eq(qty(24), "24", "butun miqdorda kasr yo'q");
eq(percent(12.5), "12.5%", "foiz belgisi bilan");

console.log("\n═══ 3. Telefon va bosh harflar ═══");

/* ⚠ Xodim kartochkasida raqam O'QILADIGAN holda ko'rinishi kerak:
   `+998901234567` bir qatorda 13 raqam — ko'z uni ajratmaydi. */
eq(phone("+998901234567"), "+998 90 123 45 67", "telefon guruhlab ko'rsatiladi");
eq(initials("Olim Karimov"), "OK", "ikki so'zdan ikki harf");

console.log(`\n${fail ? "❌" : "✅"} formatlash: ${pass} o'tdi, ${fail} yiqildi`);
process.exit(fail ? 1 : 0);
