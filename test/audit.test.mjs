/* ══════════════════════════════════════════════════════════════════════════
   AUDIT JURNALI: RO'YXAT TO'LIQ QOLSIN — sinov (V81).

   ═══ QANDAY NOSOZLIKNI QAYTARMASLIK UCHUN ═════════════════════════════

   Filtr ro'yxati ilgari RANG jadvalidan qurilardi
   (`ACTIONS = Object.keys(TONE)`). Ya'ni amalning filtrga tushishi
   uning rangi borligiga bog'liq edi va rangsiz amal ro'yxatdan
   JIMGINA yo'qolardi.

   Natijada jadvalda 15 ta amal turardi, serverda esa 51 ta. Qolgani —
   `SALE_RETURN`, `CASH_MOVEMENT`, `TRANSFER_*` va hatto admin
   panelining O'Z amallari (`ADMIN_CREATE`, `ADMIN_PASSWORD_RESET`) —
   jurnalda ko'rinardi, lekin ularni TANLAB bo'lmasdi.

   Nazorat vositasi uchun bu eng yomon nosozlik turi: ma'lumot bor,
   unga yetib bo'lmaydi, va hech qayerda xato chiqmaydi.

   ⚠ SERVER ENUMINI BU YERDAN KO'RIB BO'LMAYDI (boshqa repo). Shuning
   uchun sinov ICHKI ZIDDIYATLARNI ushlaydi: ro'yxatdagi amalning
   yorlig'i yo'qligini, yorlig'i bor amal ro'yxatda yo'qligini va
   filtrning ro'yxatdan torroq bo'lishini. Yangi amal qo'shilganda
   ikkala joyni ham to'ldirishga majbur qiladi.

   Ishga tushirish:  node test/audit.test.mjs
   ══════════════════════════════════════════════════════════════════════════ */

const { AUDIT_ACTION, entry, options } = await import("../src/lib/ek-labels.js");
const LOCALES = (await import("../src/lib/ek-locales.js")).default
             ?? (await import("../src/lib/ek-locales.js"));

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log("  ✅ " + m); };
const bad = (m, got) => { fail++; console.log("  ❌ " + m); if (got !== undefined) console.log("     olindi: " + JSON.stringify(got)); };
const eq  = (a, e, m) => (a === e ? ok(m) : bad(`${m} (kutilgan: ${JSON.stringify(e)})`, a));
const yes = (v, m) => (v ? ok(m) : bad(m, v));

const KEYS = Object.keys(AUDIT_ACTION);
const LANGS = ["uz", "ru", "en"];

console.log("\n═══ 1. Ro'yxat bo'sh emas va takrorsiz ═══");
yes(KEYS.length >= 50, `${KEYS.length} ta amal`);
eq(new Set(KEYS).size, KEYS.length, "takrorlanadigan kalit yo'q");

console.log("\n═══ 2. Har amalning YORLIG'I uchala tilda bor ═══");
/* ⚠ Yorliqsiz amal ekranda XOM KALIT bo'lib chiqadi
   («enum.audit.SALE_RETURN») — jurnal o'sha zahoti buzilgan
   ko'rinishga tushadi. */
{
  let missing = [];
  for (const lang of LANGS) {
    for (const k of KEYS) {
      if (!LOCALES[lang]?.[`enum.audit.${k}`]) missing.push(`${lang}:${k}`);
    }
  }
  missing.length === 0 ? ok(`${KEYS.length} × 3 = ${KEYS.length * 3} yorliq joyida`)
                       : bad("yorliqsiz amal bor", missing.slice(0, 10));
}

console.log("\n═══ 3. Ortiqcha yorliq yo'q (o'lik matn) ═══");
{
  const inLocale = Object.keys(LOCALES.uz)
    .filter((k) => k.startsWith("enum.audit."))
    .map((k) => k.slice("enum.audit.".length));
  const dead = inLocale.filter((k) => !KEYS.includes(k));
  dead.length === 0 ? ok("hamma yorliq ishlatiladi")
                    : bad("ro'yxatda yo'q yorliq bor", dead);
}

console.log("\n═══ 4. ⚠ FILTR RO'YXATI — AYNAN AMALLAR RO'YXATI ═══");
/* Aynan shu shart buzilgan edi: filtr rang jadvalidan qurilib,
   ro'yxatdan uch barobar qisqa chiqardi. */
{
  const opts = options(AUDIT_ACTION);
  eq(opts.length, KEYS.length, "filtr ro'yxati amallar soniga teng");
  const lost = KEYS.filter((k) => !opts.some((o) => o.value === k));
  lost.length === 0 ? ok("birorta amal filtrdan tushib qolmadi") : bad("filtrda yo'q", lost);
  yes(opts.every((o) => o.label && !o.label.startsWith("enum.")),
      "har variantda o'qiladigan matn bor");
}

console.log("\n═══ 5. Rang — faqat `Badge` biladigan qiymat ═══");
/* Noma'lum rang `badge-<nom>` sinfini beradi va u CSS da yo'q:
   belgi rangsiz, ya'ni ogohlantirish ko'rinmay qoladi. */
{
  const OK = ["red", "yellow", "green", "blue", "gray"];
  const wrong = KEYS.filter((k) => AUDIT_ACTION[k].color && !OK.includes(AUDIT_ACTION[k].color));
  wrong.length === 0 ? ok("hamma rang to'g'ri") : bad("noma'lum rang", wrong);
  /* Rangsiz amal — MUAMMO EMAS: u kulrang chiqadi. Muhimi, rang
     yo'qligi uni ro'yxatdan CHIQARIB yubormasin (4-bo'lim). */
  yes(KEYS.some((k) => !AUDIT_ACTION[k].color), "rangsiz amal ham ro'yxatda qoladi");
}

console.log("\n═══ 6. Har amalning ikonkasi bor ═══");
{
  const noIcon = KEYS.filter((k) => !AUDIT_ACTION[k].icon);
  noIcon.length === 0 ? ok("hammasida ikonka bor") : bad("ikonkasiz", noIcon);
}

console.log("\n═══ 7. ⚠ NOMA'LUM AMALDA XOM KALIT CHIQMAYDI ═══");
/* Server yangi amal qo'shsa, u bu yerga yetib kelguncha jurnal
   ishlashda davom etishi kerak — «SOME_NEW_ACTION» emas,
   «Some new action». */
{
  const e = entry(AUDIT_ACTION, "SOME_NEW_ACTION");
  eq(e.label, "Some new action", "noma'lum amal o'qiladigan matnga aylandi");
  yes(!String(e.label).startsWith("enum."), "xom kalit chiqmaydi");
  eq(entry(AUDIT_ACTION, null).label, "—", "bo'sh qiymat — chiziqcha");
}

console.log("\n═══ 8. Pulga tegadigan amallar belgilangan ═══");
/* Ular jurnalning ASOSIY maqsadi: «bu pulni kim chiqardi?». Rangsiz
   qolsa, admin ularni ro'yxatdan ajrata olmasdi. */
{
  const MONEY = ["SALE_CANCEL", "SALE_RETURN", "CASH_MOVEMENT", "CUSTOMER_DEBT_ADJUST",
                 "BONUS_ADJUST", "EXPENSE_DELETE", "SUPPLIER_PAYMENT", "PAYMENT_REGISTER"];
  const plain = MONEY.filter((k) => !AUDIT_ACTION[k]?.color);
  plain.length === 0 ? ok("pulga tegadigan amallar rangli") : bad("rangsiz qolgan", plain);
  /* ⚠ Bekor qilish QIZIL, qaytarish esa SARIQ: ikkalasi ham pulga
     tegadi, lekin qaytarish — odatiy savdo hodisasi, bekor qilish esa
     `GuardedAction` izohida «eng ko'p suiiste'mol qilinadigan amal». */
  eq(AUDIT_ACTION.SALE_CANCEL.color, "red", "sotuvni bekor qilish — qizil");
  eq(AUDIT_ACTION.SALE_RETURN.color, "yellow", "qaytarish — sariq");
}

console.log(`\n  ${pass} o'tdi, ${fail} yiqildi`);
process.exit(fail ? 1 : 0);
