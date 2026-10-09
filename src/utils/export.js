/* ══════════════════════════════════════════════════════════════════════════
   Jadval eksporti — haqiqiy Excel (.xlsx) va chop etish (PDF uchun)

   · Excel → `.xlsx`, kutubxonasiz: yozuvchi `lib/ek-xlsx.js` (kassa
             ilovasidan nusxa) va u faqat tugma bosilganda yuklanadi
             (`import()`), ya'ni panel hajmiga qo'shilmaydi.
             Ilgari bu yerda CSV yozilardi — Excel uni ochardi, lekin
             raqamlar matn bo'lib qolardi va ustunni jamlab bo'lmasdi.
   · PDF   → brauzerning "Chop etish → PDF ga saqlash" oynasi. Natija
             haqiqiy PDF, hujjat esa foydalanuvchining shrifti va tili
             bilan chiqadi.

   Egasi (2026-10-09): «har qanday jadval ko'rinishidagi ma'lumotni
   Excel'ga yuklab olish imkoni bo'lsin».
   ══════════════════════════════════════════════════════════════════════════ */
import { toNumber } from "../lib/ek-table-xlsx.js";

/**
 * Bitta katak. Son — son bo'lib qoladi (Excel jamlay olsin); «1 250 000
 * so'm» kabi matn ham songa aylanadi. Telefon, shtrix-kod, «0» bilan
 * boshlanadigan kod matn qoladi (`toNumber` ularni rad etadi).
 *
 * `= + - @` bilan boshlanadigan matn oldiga apostrof qo'yiladi: fayl
 * boshqa dasturda (yoki CSV ga qayta saqlanib) ochilganda do'kon nomi
 * `=HYPERLINK(...)` formula bo'lib ketmasin.
 */
export function xlsxCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return String(value);
  const n = toNumber(value);
  if (n != null) return n;
  const s = String(value);
  // Telefon («+998 90 …») formula emas — apostrof u yerda faqat xalaqit beradi.
  if (/^\+[\d\s()-]+$/.test(s)) return s;
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Varaq qatorlari: birinchi qator — qalin sarlavhalar. */
export function xlsxRows(headers, rows) {
  return [
    (headers || []).map((h) => ({ v: String(h ?? ""), bold: true })),
    ...(rows || []).map((r) => (r || []).map(xlsxCell)),
  ];
}

const p2 = (n) => String(n).padStart(2, "0");

/**
 * Eksport uchun sana — `2026-08-06`.
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

/** Eksport uchun sana va vaqt — `2026-08-06 14:35`. */
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
