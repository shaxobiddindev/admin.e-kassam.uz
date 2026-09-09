/* ══════════════════════════════════════════════════════════════════════════
   TIZIM SOG'LIGI EKRANINING IKKITA QOIDASI

   Ikkalasi ham sahifadan CHIQARILGAN — sahifa ichida qolsa sinab
   bo'lmasdi, ular esa aynan sinash kerak bo'lgan joylar.
   ══════════════════════════════════════════════════════════════════════════ */

import { OPS_FINDING } from "./ek-labels.js";

/**
 * Ulushni foizga aylantiradi.
 *
 * <p>⚠ `null`/`undefined` — «HALI O'LCHANMAGAN», nol EMAS. Ularni `0%`
 * deb ko'rsatish «hammasi joyida» degan YOLG'ON xabar berardi — va
 * aynan RLS yoqilgan birinchi soatda, o'lchov hali to'planmagan
 * paytda. Shuning uchun bu yerda chiziqcha.
 */
export function sharePct(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * Belgi turining o'qiladigan nomi.
 *
 * <p>⚠ TOPILMAGAN TUR YASHIRILMAYDI, xom nomi chiqadi. `ops_findings.kind`
 * — enum emas, MATN ustuni: backend yangi qo'riqchi qo'shsa, u eski
 * frontga ham keladi. Yashirilsa o'sha yangi qo'riqchining
 * ogohlantirishi jimgina ko'rinmas bo'lardi — ya'ni qo'riqchi bor,
 * lekin u hech kimga gapirmaydi.
 */
export function findingLabel(kind) {
  const meta = OPS_FINDING[kind];
  return meta ? meta.label : kind;
}

/** Belgi turining rangi; noma'lum tur ham e'tiborni tortsin. */
export function findingTone(kind) {
  return OPS_FINDING[kind]?.tone || "warn";
}
