import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useT } from "../lib/ek-i18n";

/* ══════════════════════════════════════════════════════════════════════════
   Uzun jadval — 07-ADMIN.md: «50 qatordan ortiq bo'lsa virtualizatsiya».

   NEGA KERAK: mijozlar ro'yxati serverdan BUTUNLAY keladi. 10 000 mijozda
   brauzer 10 000 ta `<tr>` yasaydi, har birida bir nechta `<td>` — sahifa
   ochilishi soniyalarga cho'ziladi va aylantirish tutila boshlaydi.

   USUL: ko'rinmaydigan qatorlar ikkita BO'SH `<tr>` ning balandligiga
   aylanadi. `position: absolute` bilan qilinsa jadval o'z ustun
   kengliklarini yo'qotardi va sarlavha tanaga mos kelmay qolardi.

   ⚠ CHEGARADAN PASTDA VIRTUALIZATSIYA QILINMAYDI. 50 qatorgacha oddiy
   jadval tez ishlaydi, virtualizatsiya esa Ctrl+F bilan qidirishni va
   sahifani chop etishni buzadi. Foydani yo'qotib zarar keltirmaslik kerak.
   ══════════════════════════════════════════════════════════════════════════ */

/** Jadval standarti bo'yicha qator balandligi (07-ADMIN.md). */
const ROW_H = 44;

/** Shu qiymatdan ko'p qator bo'lsagina virtualizatsiya yoqiladi. */
export const VIRTUALIZE_FROM = 50;

/**
 * Chop etish paytida virtualizatsiya O'CHIRILADI.
 *
 * ⚠ BU CSS BILAN HAL BO'LMAYDI. `@media print` da `overflow: visible`
 * berilsa ham, DOM'da baribir faqat ~18 qator turadi — qog'ozga 200 ta
 * mijozdan 18 tasi tushardi va hech kim buni sezmasdi.
 *
 * `flushSync` SHART: `beforeprint` dan keyin brauzer darhol chop etish
 * ko'rinishini tayyorlaydi va React'ning odatdagi (kechiktirilgan)
 * yangilanishi unga ULGURMAYDI.
 */
function usePrintMode() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const on  = () => flushSync(() => setPrinting(true));
    const off = () => setPrinting(false);
    window.addEventListener("beforeprint", on);
    window.addEventListener("afterprint", off);
    return () => {
      window.removeEventListener("beforeprint", on);
      window.removeEventListener("afterprint", off);
    };
  }, []);

  return printing;
}

/**
 * @param {Array}    rows       to'liq qatorlar ro'yxati
 * @param {Function} renderRow  `(row, index) => <tr>…</tr>`
 * @param {number}   maxHeight  aylantiriladigan maydon balandligi (px)
 * @param {ReactNode} head      `<thead>…</thead>`
 * @param {ReactNode} empty     ro'yxat bo'sh bo'lsa ko'rsatiladigan qator
 */
export default function VirtualTable({ rows, renderRow, head, empty, maxHeight = 600 }) {
  const { t } = useT();
  const scrollRef = useRef(null);
  const printing  = usePrintMode();
  const on = rows.length > VIRTUALIZE_FROM && !printing;

  const virt = useVirtualizer({
    count: on ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    // Ko'rinish chegarasidan tashqarida 8 qator zaxira — tez aylantirishda
    // bo'sh joy miltillab ketmasin.
    overscan: 8,
  });

  if (!on) {
    return (
      <div className="tw">
        <table>{head}<tbody>{rows.length ? rows.map(renderRow) : empty}</tbody></table>
      </div>
    );
  }

  const items  = virt.getVirtualItems();
  const before = items.length ? items[0].start : 0;
  const after  = items.length ? virt.getTotalSize() - items[items.length - 1].end : 0;

  return (
    <>
      <div className="tw ek-vrows" ref={scrollRef} style={{ maxHeight }}>
        <table>
          {head}
          <tbody>
            {before > 0 && <tr aria-hidden="true" style={{ height: before }}><td /></tr>}
            {items.map((v) => renderRow(rows[v.index], v.index))}
            {after > 0 && <tr aria-hidden="true" style={{ height: after }}><td /></tr>}
          </tbody>
        </table>
      </div>
      {/* Nima bo'layotganini AYTAMIZ: "jadvalda 8000 qator bor edi-ku, qani?"
          degan savol tug'ilmasin. Ekran o'quvchi ham shu matnni oladi. */}
      <div className="ek-vhint" role="status">
        {t("table.virtualHint", { n: rows.length, shown: items.length })}
      </div>
    </>
  );
}
