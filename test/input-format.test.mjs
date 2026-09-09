/* ══════════════════════════════════════════════════════════════════════════
   KIRITISH MAYDONLARI — admin paneldagi shartnoma

   ═══ NEGA BU FAYL YOZILDI ═════════════════════════════════════════════

   `ek-input.js` — UCHALA ilovaga ko'chiriladigan UMUMIY fayl
   (`packages/ui/`, sync-tokens.ps1). Nusxalar QO'LDA ko'chirilgani
   uchun ular bir-biridan ajralib ketishi mumkin va bu JIMGINA bo'ladi.

   ⚠ AYNAN SHU BO'LDI. «7 249.» nuqsoni (§65) `app` nusxasida
   tuzatilgan, `admin` va `auth` nusxasida esa TUZATILMAGAN holicha
   qolgan edi. Sinov yozilgunga qadar buni hech narsa ko'rsatmasdi:
   uchala repoda ham fayl bor, uchalasi ham «ishlaydi», faqat bittasi
   boshqacha ishlaydi.

   Shuning uchun shartnoma har bir repoda ALOHIDA qulflanadi — nusxa
   keyingi safar sinxronlanganda tuzatish orqaga qaytib ketmasin.

   ═══ ADMIN PANELDA OQIBATI ════════════════════════════════════════════

   Bu maydonlar orqali admin DO'KON va XODIM yaratadi. Noto'g'ri
   telefon — SMS ketmaydigan raqam; noto'g'ri login — egasi kira
   olmaydigan hisob. Ikkalasi ham xato bermaydi, keyin ochiladi.

   Ishga tushirish:  node test/input-format.test.mjs
   ══════════════════════════════════════════════════════════════════════════ */
import {
  displayNumber, numberInput, phoneInput, isPhone, usernameInput, isUsername,
  codeInput, nameInput, otpInput, emailInput, isEmail, mxikInput, isMxik,
  isBarcodeChecksumValid,
} from "../src/lib/ek-input.js";

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log("  ✅ " + m); };
const bad = (m, got) => { fail++; console.log("  ❌ " + m);
                          if (got !== undefined) console.log("     olindi: " + JSON.stringify(got)); };
const eq  = (actual, expected, msg) =>
  (actual === expected ? ok(msg) : bad(`${msg} (kutilgan: ${JSON.stringify(expected)})`, actual));

/* ⚠ QOCHIRISH BILAN YOZILADI, HARFI BILAN EMAS. Razryad ajratgichi —
   tor bo'shliq (U+202F), u ekranda oddiy probeldan farq qilmaydi.
   Harfi bilan yozilsa, muharrir yoki nusxa ko'chirish uni jimgina
   oddiy probelga almashtirishi mumkin va sinov o'zi noto'g'ri
   sababdan yiqilardi. */
const NNBSP = "\u202F";

console.log("\n═══ 1. Son maydoni — `NumField` shartnomasi ═══");

/* ⚠ BUTUN SON MAYDONIDA NUQTA HECH QACHON CHIQMAYDI. Server 2 kasr
   bilan yuborgan qiymat («7249.99») butun son maydoniga tushganda
   kasr kesilar-u NUQTA qolardi: maydonda «7 249.» degan chala raqam
   turardi (§65). Admin panelda `kind="int"` shu yo'ldan o'tadi. */
eq(displayNumber("7249.99", { decimals: 0 }), "7" + NNBSP + "249",
   "butun son maydonida chala «7 249.» chiqmaydi");
eq(displayNumber("7249.99", { decimals: 2 }), "7" + NNBSP + "249.99",
   "ikki kasrli maydonda kasr QOLADI");
eq(displayNumber("1234500", { decimals: 0 }), "1" + NNBSP + "234" + NNBSP + "500",
   "razryadlar tor bo'shliq bilan ajratiladi");
eq(displayNumber("", { decimals: 0 }), "", "bo'sh qiymat bo'sh ko'rinadi");
eq(displayNumber(null, { decimals: 0 }), "", "null — bo'sh, «0» emas");

/* Manfiy son loyihaning hech bir maydonida ma'noga ega emas. */
eq(numberInput("-500", { decimals: 0 }).raw, "500", "minus tashlanadi");
eq(numberInput("1e5", { decimals: 0 }).raw, "15", "«e» son emas — tashlanadi");
eq(numberInput("12,50", { decimals: 2 }).raw, "12.50", "vergul nuqtaga aylanadi");
eq(numberInput("120", { decimals: 0, max: 36 }).raw, "36", "chegara YOZAYOTGANDA ushlaydi");

console.log("\n═══ 2. Telefon — xodim va do'kon kartochkasi ═══");

eq(phoneInput("901234567").display, "(90) 123-45-67", "9 raqam niqobga tushadi");
eq(phoneInput("901234567").raw, "+998901234567", "serverga to'liq raqam ketadi");
/* ⚠ 13 raqamli raqamga na SMS ketadi, na qo'ng'iroq — do'kon
   kartochkasi jimgina buziladi. */
eq(phoneInput("+9989962806286").digits.length, 9, "13 raqamli raqam 9 taga kesiladi");
/* ⚠ Raqamni O'CHIRA boshlaganda «998» abonent raqamiga aylanib
   ketardi: `+998901234` dan «(99) 890-12-34» chiqardi. */
eq(phoneInput("+998901234").display, "(90) 123-4", "raqam o'chirilganda «998» abonentga aylanmaydi");
eq(isPhone("901234567"), true, "to'liq raqam haqiqiy");
eq(isPhone("90123456"), false, "8 raqam — haqiqiy emas");

console.log("\n═══ 3. Login va do'kon kodi ═══");

eq(usernameInput("  Kassir  "), "kassir", "bosh harf va bo'shliq — ikkalasi ham yo'qoladi (§51)");
eq(usernameInput("Кассир"), "", "kirill login — umuman kiritilmaydi");
eq(isUsername("ab"), false, "ikki belgili login rad etiladi");
eq(isUsername("kassir_1"), true, "pastki chiziq loginda RUXSAT");
eq(codeInput(" MAGAZIN-01 "), "magazin-01", "do'kon kodi kichik harfga tushadi");
eq(nameInput("Ali Valiyev 7"), "Ali Valiyev ", "ismda raqam bo'lmaydi");
eq(nameInput("Пётр"), "Пётр", "kirill ISM — qoladi (login emas, bu odamning ismi)");

console.log("\n═══ 4. Kod, pochta, MXIK, shtrix-kod ═══");

eq(otpInput("abcd-efgh"), "ABCD-EFGH", "tiklash kodi KATTA harfga o'tadi");
eq(emailInput(" Ali@Mail.RU "), "ali@mail.ru", "pochtadagi bo'shliq va katta harf ketadi");
eq(isEmail("ali@mail"), false, "domensiz manzil rad etiladi");
eq(mxikInput("abc123"), "123", "MXIK faqat raqam");
eq(isMxik("1".repeat(17)), true, "MXIK — aynan 17 raqam");
eq(isMxik("1".repeat(16)), false, "16 raqamli MXIK rad etiladi");
eq(isBarcodeChecksumValid("4780015850178"), true, "haqiqiy EAN-13 nazorat raqami");
eq(isBarcodeChecksumValid("4780015850173"), false, "buzilgan nazorat raqami ushlanadi");

console.log(`\n${fail ? "❌" : "✅"} kiritish maydonlari: ${pass} o'tdi, ${fail} yiqildi`);
process.exit(fail ? 1 : 0);
