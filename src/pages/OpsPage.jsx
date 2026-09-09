import { useCallback, useEffect, useState } from "react";
import { opsApi } from "../api";
import { fmtDateTime } from "../utils";
import { useT } from "../lib/ek-i18n";
import { sharePct, findingLabel, findingTone } from "../lib/ek-ops";
import { Empty, Badge } from "../components/ui";
import { useConfirm } from "../context/ConfirmProvider";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { asArray } from "../lib/ek-array";

/* ══════════════════════════════════════════════════════════════════════════
   TIZIM SOG'LIGI — BAZA QO'RIQCHILARI NIMA TOPGANI

   ⚠ NEGA BU EKRAN BOR. C va D bosqichlarida to'rtta qo'riqchi qo'yilgan
   edi va ularning hammasi ishlab turardi:

     · ishga tushishdagi indeks tekshiruvi (`IndexHealthCheck`);
     · nusxa ustunning ayrilishi (`BarcodeDriftService`);
     · jurnaldan tiklanmagan barkodlar (V122);
     · RLS bo'shlik zondi (`RlsEmptinessProbe`).

   Ularning hammasi `ops_findings` ga yozadi va ERROR darajasida jurnalga
   ham tushadi. Lekin konteyner jurnalini hech kim kunda o'qimaydi —
   ya'ni qo'riqchi ishlaydi, ogohlantiradi va OGOHLANTIRISH HECH KIMGA
   YETIB BORMAYDI. Bu qo'riqchining umuman bo'lmasligidan ham yomonroq:
   himoya bor deb o'ylanadi.

   ⚠ EKRANNING MARKAZIDA JADVAL EMAS, HOLAT. Birinchi ko'rinadigan narsa —
   «hammasi joyidami» degan savolga bitta javob. Ro'yxat esa pastda,
   faqat muammo bo'lganda kerak bo'ladi.

   ⚠ TEKSHIRUV VA TUZATISH ALOHIDA TUGMALARDA. Ko'rish bilan o'zgartirish
   bir tugmada bo'lsa, «bir qarab qo'yay» degan odam bazani o'zgartirib
   qo'yardi.
   ══════════════════════════════════════════════════════════════════════════ */

export default function OpsPage({ toast }) {
  const { t } = useT();
  const confirm = useConfirm();

  const [findings, setFindings] = useState([]);
  const [empty,    setEmpty]    = useState(null);
  const [drift,    setDrift]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const busy = useLoading(loading);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      /* ⚠ `Promise.all` EMAS, ketma-ket emas ham: har biri alohida
         `catch` bilan. Bo'shlik zondi yiqilsa ham belgilar ro'yxati
         ko'rinishi kerak — aks holda bitta nosozlik butun ekranni
         o'chirib qo'yardi va aynan kerak bo'lgan paytda. */
      const [f, e] = await Promise.allSettled([opsApi.findings(), opsApi.emptiness()]);
      setFindings(f.status === "fulfilled" ? asArray(f.value.data) : []);
      setEmpty(e.status === "fulfilled" ? (e.value.data || null) : null);
      if (f.status === "rejected") toast.error(`${t("common.loadFailed")}: ${f.reason.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const checkDrift = async () => {
    setActing("drift");
    try {
      const n = (await opsApi.barcodeDrift()).data;
      setDrift(n);
      toast.success(n > 0 ? t("ops.drift.found", { n }) : t("ops.drift.none"));
    } catch (e) { toast.error(`${t("common.error")}: ${e.message}`); }
    finally { setActing(null); }
  };

  const repairDrift = async () => {
    /* ⚠ TASDIQ SO'RALADI: bu amal ma'lumotni O'ZGARTIRADI. */
    if (!(await confirm({ title: t("ops.drift.repair"), text: t("ops.drift.confirm") }))) return;
    setActing("repair");
    try {
      const n = (await opsApi.repairDrift()).data;
      toast.success(t("ops.drift.repaired", { n }));
      setDrift(0);
      load();
    } catch (e) { toast.error(`${t("common.error")}: ${e.message}`); }
    finally { setActing(null); }
  };

  const resolve = async (row) => {
    if (!(await confirm({ title: t("ops.resolve"), text: t("ops.resolveConfirm") }))) return;
    setActing(row.id);
    try {
      await opsApi.resolve(row.id);
      toast.success(t("ops.resolved"));
      setFindings((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e) { toast.error(`${t("common.error")}: ${e.message}`); }
    finally { setActing(null); }
  };

  /* ⚠ HOLAT UCHTA EMAS, IKKITA: joyida yoki emas. «Ehtimol muammo bor»
     degan uchinchi holat odamni harakatga undamaydi. */
  const healthy = findings.length === 0 && !empty?.probeRed && !empty?.emptyShareJump;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">{t("ops.title")}</h1>
        <button className="btn btn-outline" onClick={load} disabled={busy}>
          <i className="fa-solid fa-rotate" /> {t("common.refresh")}
        </button>
      </div>

      {busy ? <SkeletonTable rows={4} /> : (
        <>
          {/* ── Bitta savolga bitta javob ─────────────────────────────── */}
          <div className={`card ops-state ${healthy ? "is-ok" : "is-bad"}`}>
            <i className={`fa-solid ${healthy ? "fa-circle-check" : "fa-triangle-exclamation"}`} />
            <div>
              <strong>{healthy ? t("ops.state.ok") : t("ops.state.bad")}</strong>
              <p className="muted">
                {healthy ? t("ops.state.okHint") : t("ops.state.badHint", { n: findings.length })}
              </p>
            </div>
          </div>

          {/* ── RLS bo'shlik zondi (D/4) ──────────────────────────────── */}
          {empty && (
            <div className="card">
              <h2 className="card-title">{t("ops.empty.title")}</h2>
              <p className="muted">{t("ops.empty.hint")}</p>
              <div className="ops-grid">
                <div>
                  <span className="muted">{t("ops.empty.probe")}</span>
                  <Badge tone={empty.probeRed ? "danger" : (empty.probeSkipped ? "muted" : "success")}>
                    {empty.probeRed ? t("ops.empty.probeRed")
                      : empty.probeSkipped ? t("ops.empty.probeOff")
                      : t("ops.empty.probeOk")}
                  </Badge>
                  {/* ⚠ QAYSI JADVAL bo'sh chiqqani ham yoziladi: «qizil»
                      degan so'zning o'zi nima qilish kerakligini aytmaydi. */}
                  {asArray(empty.probeEmptyTables).length > 0 && (
                    <p className="muted">{asArray(empty.probeEmptyTables).join(", ")}</p>
                  )}
                </div>
                <div>
                  <span className="muted">{t("ops.empty.share")}</span>
                  <strong>{sharePct(empty.emptyShare24h)}</strong>
                  <p className="muted">
                    {t("ops.empty.baseline")}: {sharePct(empty.emptyShareBaseline)}
                    {" · "}{t("ops.empty.samples")}: {empty.emptySamples24h ?? 0}
                  </p>
                  {empty.emptyShareJump && (
                    <Badge tone="danger">{t("ops.empty.jump")}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Nusxa ustun ayrilishi (C/4) ───────────────────────────── */}
          <div className="card">
            <h2 className="card-title">{t("ops.drift.title")}</h2>
            <p className="muted">{t("ops.drift.hint")}</p>
            <div className="row-actions">
              <button className="btn btn-outline" onClick={checkDrift} disabled={acting === "drift"}>
                {acting === "drift" ? <Spinner /> : <i className="fa-solid fa-magnifying-glass" />}
                {" "}{t("ops.drift.check")}
              </button>
              <button className="btn btn-primary" onClick={repairDrift}
                      disabled={acting === "repair" || drift === 0 || drift === null}>
                {acting === "repair" ? <Spinner /> : <i className="fa-solid fa-wrench" />}
                {" "}{t("ops.drift.repair")}
              </button>
              {drift !== null && (
                <span className="muted">
                  {drift > 0 ? t("ops.drift.found", { n: drift }) : t("ops.drift.none")}
                </span>
              )}
            </div>
          </div>

          {/* ── Belgilar ro'yxati ─────────────────────────────────────── */}
          <div className="card">
            <h2 className="card-title">{t("ops.findings.title")}</h2>
            {findings.length === 0 ? (
              <Empty icon="fa-circle-check" title={t("ops.findings.empty")} />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("ops.findings.kind")}</th>
                      <th>{t("ops.findings.shop")}</th>
                      <th>{t("ops.findings.what")}</th>
                      <th>{t("ops.findings.when")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((row) => {
                      return (
                        <tr key={row.id}>
                          <td>
                            {/* ⚠ Yorliq topilmasa XOM NOM chiqadi: yashirish
                                yangi qo'riqchini ko'rinmas qilardi. */}
                            <Badge tone={findingTone(row.kind)}>
                              {findingLabel(row.kind)}
                            </Badge>
                          </td>
                          <td>{row.shopId ?? "—"}</td>
                          <td>
                            <strong>{row.summary || "—"}</strong>
                            {row.details && <p className="muted">{row.details}</p>}
                          </td>
                          <td>{fmtDateTime(row.createdAt)}</td>
                          <td className="ta-right">
                            <button className="btn btn-sm btn-outline"
                                    onClick={() => resolve(row)}
                                    disabled={acting === row.id}>
                              {acting === row.id ? <Spinner /> : t("ops.resolve")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
