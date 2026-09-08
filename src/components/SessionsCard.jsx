import { useCallback, useEffect, useState } from "react";
import { useT } from "../lib/ek-i18n";
import { authApi } from "../api";
import { useConfirm } from "../context/ConfirmProvider";

/* ══════════════════════════════════════════════════════════════════════════
   KIRGAN QURILMALAR (V100)

   ═══ NEGA KERAK ═══════════════════════════════════════════════════════

   Admin hisobi tizimdagi eng qimmatli nishon, lekin uning sessiyalarini
   KO'RIB ham, TO'XTATIB ham bo'lmasdi. Parol bir marta oshkor bo'lsa,
   begona odam istagancha qurilmadan kirib turaverar va haqiqiy admin
   buni HECH QACHON bilmasdi: hech qayerda «yana kim kirgan» degan
   ro'yxat yo'q edi. Yagona chora — parolni almashtirish edi, u ham
   faqat gumon bo'lganda, gumon uchun esa asos yo'q edi.

   ⚠ «BITTA QURILMA» QOIDASI EMAS. Do'kon xodimlariga bunday qoida
   qo'yilgan va uni shu yerga ko'chirish oson ko'rinadi, lekin sabablar
   BOSHQA: kassir bitta kassada turadi, admin esa noutbukdan ham,
   telefondan ham ishlaydi. Uni majburan bitta qurilmaga bog'lash —
   tizim egasini eng nomunosib paytda o'z panelidan chiqarib yuborish
   demakdir. Shuning uchun bu yerda MAJBURLASH emas, KO'RINUVCHANLIK.
   ══════════════════════════════════════════════════════════════════════════ */

/** Brauzer satridan o'qiladigan qisqa nom — to'liq satr foydasiz uzun. */
function shortAgent(ua) {
  if (!ua) return "—";
  const browser = /Firefox\/\d/.test(ua) ? "Firefox"
    : /Edg\/\d/.test(ua) ? "Edge"
    : /Chrome\/\d/.test(ua) ? "Chrome"
    : /Safari\/\d/.test(ua) ? "Safari" : null;
  const os = /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || ua.slice(0, 28);
}

const when = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

export default function SessionsCard({ toast }) {
  /* ⚠ `useT()` OBYEKT qaytaradi, funksiya emas. Boshida bu yerda
     `const t = useT()` turardi va sozlamalar sahifasi butunlay
     yiqilardi («t is not a function») — ya'ni yangi kartochka
     eskilarini ham o'zi bilan olib ketardi. Brauzer tekshiruvi
     tutdi. */
  const { t } = useT();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await authApi.sessions();
      setRows(Array.isArray(r?.data) ? r.data : []);
    } catch {
      /* ⚠ XATO JIMGINA YUTILADI: bu kartochka sozlamalar sahifasining
         ishlashi uchun KERAK EMAS. U yiqilsa ro'yxat chizilmaydi —
         sahifa esa qolgan sozlamalari bilan ochilaveradi. */
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const others = rows.filter((r) => !r.current).length;

  const revoke = async () => {
    if (!(await confirm({
      title: t("settings.sessionsRevoke"),
      text: t("settings.sessionsDelay"),
      danger: true,
    }))) return;
    setBusy(true);
    try {
      const r = await authApi.revokeOthers();
      toast?.success(r?.message || t("settings.sessionsRevoke"));
      await load();
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card set-card">
      <div className="c-head">
        <span className="c-title">
          <i className="fa-solid fa-laptop" aria-hidden="true" /> {t("settings.sessions")}
        </span>
      </div>
      <p className="set-card__hint">{t("settings.sessionsHint")}</p>

      <ul className="ses-list">
        {rows.map((r) => (
          <li key={r.id} className={`ses-row${r.current ? " is-current" : ""}`}>
            <div className="ses-row__main">
              <span className="ses-row__ua">{shortAgent(r.userAgent)}</span>
              {/* ⚠ «Shu qurilma» BELGISI SHART: usiz admin qatorlarni
                  farqlay olmasdi va hech birini bosishga jur'at
                  etmasdi — «o'zimni chiqarib yubormayapmanmi?» */}
              {r.current && (
                <span className="badge badge-green">{t("settings.sessionCurrent")}</span>
              )}
            </div>
            <div className="ses-row__meta ek-num">
              {r.ipAddress || "—"} · {when(r.createdAt)}
            </div>
          </li>
        ))}
      </ul>

      {others > 0 ? (
        <button className="btn btn-danger btn-sm" onClick={revoke} disabled={busy}>
          <i className="fa-solid fa-power-off" aria-hidden="true" />
          {t("settings.sessionsRevoke")} ({others})
        </button>
      ) : (
        <p className="set-card__hint">{t("settings.sessionsOnlyOne")}</p>
      )}
    </div>
  );
}
