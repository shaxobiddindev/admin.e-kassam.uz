import { useT } from "../lib/ek-i18n";
import { downloadCsv, printView } from "../utils/export";

/* ══════════════════════════════════════════════════════════════════════════
   Jadval ustidagi eksport tugmalari — 07-ADMIN.md "Excel/PDF eksport"

   Ma'lumot EKRANDAGI holatidan olinadi: qidiruv va filtrlardan keyin nima
   ko'rinayotgan bo'lsa, o'sha eksport qilinadi. Aks holda foydalanuvchi
   "Bloklangan do'konlar" ni filtrlab, faylni ochganda hammasini ko'rardi.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {string}   name     fayl nomining asosi ("dokonlar", "xodimlar" …)
 * @param {string[]} headers  ustun sarlavhalari
 * @param {Array<Array>} rows qatorlar
 * @param {object}   toast    xabar berish uchun (ixtiyoriy)
 */
export default function ExportButtons({ name, headers, rows, toast }) {
  const { t } = useT();
  const count = rows?.length || 0;

  const onCsv = () => {
    const file = downloadCsv(name, headers, rows);
    if (!file) { toast?.info?.(t("export.empty")); return; }
    toast?.success?.(t("export.done", { name: file }));
  };

  return (
    <div className="ek-export" role="group" aria-label={t("export.title")}>
      <button className="btn btn-outline btn-sm" onClick={onCsv} disabled={!count}>
        <i className="fa-solid fa-file-csv" aria-hidden="true" /> {t("export.csv")}
      </button>
      {/* Chop etish oynasi PDF ni ham beradi — brauzerning "PDF ga saqlash"i.
          Alohida PDF kutubxonasi ~100 KB gzip qo'shardi va u faqat shu
          tugma bosilganda kerak bo'lardi. */}
      <button className="btn btn-outline btn-sm" onClick={printView} disabled={!count}>
        <i className="fa-solid fa-file-pdf" aria-hidden="true" /> {t("export.print")}
      </button>
    </div>
  );
}
