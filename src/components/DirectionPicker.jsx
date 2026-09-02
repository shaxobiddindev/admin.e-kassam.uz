import { useT } from "../lib/ek-i18n";

/* ══════════════════════════════════════════════════════════════════════════
   XIZMAT YO'NALISHINI TANLASH

   ⚠ NEGA ODDIY TUGMA YETMADI. Avval bu yerda faqat yo'nalish NOMI turgan
   tugmalar bor edi, modullar ro'yxati esa `title` (sichqoncha tepasida
   chiqadigan izoh) ichida yashiringan edi. Natijada admin «Dorixona» ni
   tanlardi-yu, do'konda nima yo'qolishini KO'RMASDAN saqlardi — va buni
   do'kon xodimi ertasi kuni aytardi.

   Endi har bir yo'nalish uchta narsani ochiq yozadi:
     1. nomi;
     2. bir qatorlik tavsif — bu qanday joy uchun;
     3. NIMA CHEKLANADI — o'sha yo'nalishda BO'LMAYDIGAN bo'limlar.

   ⚠ Uchinchisi eng muhimi va aynan u yetishmasdi. «Nima bor» ro'yxati
   uzun va o'qilmaydi (15 ta bo'lim), «nima yo'q» esa qisqa va aynan
   qaror uchun kerak bo'lgan ma'lumot.

   ⚠ «NIMA YO'Q» QAYERDAN OLINADI. Server har bir yo'nalish uchun faqat
   BOR modullarni qaytaradi. To'liq ro'yxat — barcha yo'nalishlarning
   BIRLASHMASI; undan yo'nalishning o'z to'plami ayiriladi. Bu birlashma
   to'liq ekani serverda sinov bilan qulflangan
   (`ServiceDirectionTest.everyFeatureIsReachable`), shuning uchun
   alohida «hamma modullar» so'rovi kerak emas.
   ══════════════════════════════════════════════════════════════════════════ */

export default function DirectionPicker({ catalog, selected, onToggle }) {
  const { t } = useT();

  // Barcha yo'nalishlar bergan modullar — yuqoridagi izohga qarang.
  const allFeatures = [...new Set(catalog.flatMap((c) => c.features))];

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {catalog.map((c) => {
        const on = selected.has(c.direction);
        const missing = allFeatures.filter((f) => !c.features.includes(f));

        return (
          <button
            type="button"
            key={c.direction}
            onClick={() => onToggle(c.direction)}
            aria-pressed={on}
            style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              textAlign: "start", width: "100%", cursor: "pointer",
              padding: "10px 12px",
              borderRadius: "var(--r-lg, 10px)",
              border: `1.5px solid ${on ? "var(--border-brand, var(--fg-brand))" : "var(--border-subtle)"}`,
              background: on ? "var(--bg-brand-subtle, var(--bg-sunken))" : "var(--bg-surface)",
              font: "inherit", color: "inherit",
            }}
          >
            {/* Tanlanganini rang YOLG'IZ bildirmaydi — yonida belgi ham
                turadi (CLAUDE.md #6: rang yolg'iz signal emas). */}
            <span aria-hidden="true" style={{
              flexShrink: 0, width: 18, height: 18, marginTop: 1,
              borderRadius: 5, display: "grid", placeItems: "center",
              border: `1.5px solid ${on ? "var(--fg-brand)" : "var(--border-strong, var(--border-subtle))"}`,
              background: on ? "var(--fg-brand)" : "transparent",
              color: "#fff", fontSize: 10,
            }}>
              {on && <i className="fa-solid fa-check" />}
            </span>

            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 13 }}>
                {t(`adm.dir.${c.direction}`)}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--fg-secondary)", marginTop: 2 }}>
                {t(`adm.dirDesc.${c.direction}`)}
              </span>

              {/* ⚠ Cheklovsiz yo'nalishda «yo'q» qatori CHIZILMAYDI —
                  bo'sh ro'yxat «hech narsa yo'q» degan noto'g'ri
                  taassurot berardi. O'rniga tasdiqlovchi matn. */}
              {missing.length === 0 ? (
                <span style={{ display: "block", fontSize: 11, marginTop: 4, color: "var(--fg-success, var(--fg-secondary))" }}>
                  <i className="fa-solid fa-circle-check" aria-hidden="true" /> {t("adm.dir.noLimits")}
                </span>
              ) : (
                <span style={{ display: "block", fontSize: 11, marginTop: 4, color: "var(--fg-tertiary)" }}>
                  <b style={{ color: "var(--fg-warning)" }}>{t("adm.dir.without")}:</b>{" "}
                  {missing.map((f) => t(`adm.feat.${f}`)).join(" · ")}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
