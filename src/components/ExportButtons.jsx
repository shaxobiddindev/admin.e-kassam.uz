import { useState } from "react";
import { useT } from "../lib/ek-i18n";
import { printView, xlsxRows } from "../utils/export";
import { fileName } from "../lib/ek-table-xlsx";
import { Spinner } from "./ek/Loading";

/* ══════════════════════════════════════════════════════════════════════════
   Jadval ustidagi eksport tugmalari — 07-ADMIN.md "Excel/PDF eksport"

   Ma'lumot EKRANDAGI holatidan olinadi: qidiruv va filtrlardan keyin nima
   ko'rinayotgan bo'lsa, o'sha eksport qilinadi. Aks holda foydalanuvchi
   "Bloklangan do'konlar" ni filtrlab, faylni ochganda hammasini ko'rardi.

   Sahifalab yuklanadigan ro'yxatda ekranda faqat bir qismi turadi —
   u holda `fetchRows` beriladi va qatorlar o'sha filtrlar bilan
   serverdan yig'iladi. `null` qaytsa — qator juda ko'p.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {string}   name       fayl nomining asosi ("dokonlar", "xodimlar" …)
 * @param {string[]} headers    ustun sarlavhalari
 * @param {Array<Array>} rows   qatorlar (`fetchRows` bo'lsa — faqat tugma holati uchun)
 * @param {() => Promise<Array<Array>|null>} fetchRows  hamma qatorlar (ixtiyoriy)
 * @param {object}   toast      xabar berish uchun (ixtiyoriy)
 */
export default function ExportButtons({ name, headers, rows, fetchRows, toast }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const empty = Array.isArray(rows) ? rows.length === 0 : !fetchRows;

  const onXlsx = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = fetchRows ? await fetchRows() : rows;
      if (data === null) { toast?.error?.(t("export.tooMany")); return; }
      if (!data?.length) { toast?.info?.(t("export.empty")); return; }
      // Yozuvchi faqat bosilganda yuklanadi — panelning boshlang'ich hajmiga qo'shilmaydi.
      const { downloadXlsx } = await import("../lib/ek-xlsx");
      const file = `${fileName(name)}.xlsx`;
      downloadXlsx(file, [{ name, rows: xlsxRows(headers, data) }]);
      toast?.success?.(t("export.done", { name: file }));
    } catch (e) {
      toast?.error?.(`${t("export.failed")}: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ek-export" role="group" aria-label={t("export.title")}>
      <button className="btn btn-outline btn-sm" onClick={onXlsx} disabled={empty || busy}
              aria-busy={busy || undefined}>
        {busy ? <Spinner small /> : <i className="fa-solid fa-file-excel" aria-hidden="true" />} {t("export.xlsx")}
      </button>
      {/* Chop etish oynasi PDF ni ham beradi — brauzerning "PDF ga saqlash"i.
          Alohida PDF kutubxonasi ~100 KB gzip qo'shardi va u faqat shu
          tugma bosilganda kerak bo'lardi. */}
      <button className="btn btn-outline btn-sm" onClick={printView} disabled={empty}>
        <i className="fa-solid fa-file-pdf" aria-hidden="true" /> {t("export.print")}
      </button>
    </div>
  );
}
