/* ══════════════════════════════════════════════════════════════════════════
   Jadval eksporti — CSV (Excel uchun) va chop etish (PDF uchun)

   ⚠ NEGA `xlsx` VA `jspdf` KUTUBXONALARI ISHLATILMAYDI

   07-ADMIN.md "Excel/PDF eksport" deydi. To'g'ridan-to'g'ri o'qilsa, bu
   SheetJS (~140 KB gzip) + jsPDF/autotable (~100 KB gzip) degani — panelning
   hozirgi butun hajmidan ikki barobar ko'p, va ikkalasi ham FAQAT tugma
   bosilganda kerak bo'ladi.

   Shuning uchun:
     · Excel  → CSV. Excel uni ikki marta bosishda ochadi, LibreOffice ham.
                UTF-8 BOM va `;` ajratkich — Excel'ning O'zbekiston/rus
                lokalidagi standarti (`,` bilan barcha ustun bitta katakka
                tushib qolardi).
     · PDF    → brauzerning "Chop etish → PDF ga saqlash" oynasi. Natija
                haqiqiy PDF, hujjat esa foydalanuvchining shrifti va tili
                bilan chiqadi.

   Ikkalasi ham NOLTA baytlik bog'liqlik. Chetlanish `09-CHETLANISHLAR.md`
   da yozilgan.
   ══════════════════════════════════════════════════════════════════════════ */

/** Excel'ning lokalga bog'liq talqiniga eng mos ajratkich. */
const SEP = ";";

/**
 * Bitta katakni CSV qoidalari bo'yicha qochiradi.
 *
 * `=` bilan boshlanadigan qiymat Excel'da FORMULA bo'lib ketadi (do'kon nomi
 * `=SUM(...)` bo'lsa — bu formula in'ektsiyasi). Bunday qiymat oldiga
 * apostrof qo'yiladi.
 */
function cell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (s.includes('"') || s.includes(SEP) || s.includes("\n") || s.includes("\r")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * CSV faylni yaratib yuklab beradi.
 *
 * @param {string}   filename  kengaytmasiz nom, masalan "dokonlar"
 * @param {string[]} headers   ustun sarlavhalari (allaqachon tarjima qilingan)
 * @param {Array<Array>} rows  qatorlar, `headers` bilan bir xil tartibda
 * @returns {string|null} yaratilgan fayl nomi, qator bo'lmasa `null`
 */
export function downloadCsv(filename, headers, rows) {
  if (!rows || rows.length === 0) return null;

  const body = [headers, ...rows]
    .map((r) => r.map(cell).join(SEP))
    .join("\r\n");

  // ⚠ BOM (﻿) SHART: usiz Excel faylni ANSI deb o'qiydi va
  // o'zbekcha «o'» / kirill harflari buziladi.
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });

  const name = `${filename}-${stamp()}.csv`;
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Brauzer yuklashni boshlashi uchun bir kadr kutamiz, keyin bo'shatamiz.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return name;
}

const p2 = (n) => String(n).padStart(2, "0");

/** `2026-08-06_1435` — fayl nomiga qo'shiladi, eski nusxa ustiga yozilmasin. */
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`;
}

/**
 * CSV uchun sana — `2026-08-06`.
 *
 * ⚠ Ekrandagi `fmtDate` ISHLATILMAYDI. U "6-avgust 2026" beradi va Excel
 * bunday qiymatni MATN deb qabul qiladi: ustunni sanaga qarab saralab ham,
 * filtrlab ham bo'lmaydi. ISO shakli esa uchala tilda bir xil va
 * alifbo bo'yicha saralash ham to'g'ri natija beradi.
 */
export function isoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** CSV uchun sana va vaqt — `2026-08-06 14:35`. */
export function isoDateTime(value) {
  const day = isoDate(value);
  if (!day) return "";
  const d = new Date(value);
  return `${day} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/**
 * Chop etish oynasini ochadi — foydalanuvchi "PDF ga saqlash" ni tanlaydi.
 *
 * Bu yerda hech narsa yasalmaydi: sahifaning O'ZI chop etiladi, yon menyu,
 * tepa panel va tugmalar esa `styles.css` dagi `@media print` bloki bilan
 * yashiriladi. Shu sababli qog'ozga har doim ekrandagi joriy filtr natijasi
 * tushadi va ikkinchi "chop etish uchun" ko'rinishni saqlash shart emas.
 */
export function printView() {
  window.print();
}
