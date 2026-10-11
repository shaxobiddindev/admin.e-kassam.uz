import { Fragment, useCallback, useEffect, useState } from "react";
import { clientErrorApi } from "../api";
import { fmtDateTime } from "../utils";
import { useT } from "../lib/ek-i18n";
import { Empty, Badge } from "../components/ui";
import Select from "../components/ek/Select";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { asArray } from "../lib/ek-array";

/* ══════════════════════════════════════════════════════════════════════════
   ILOVA XATOLARI — kassada nima yiqildi (V163)

   ⚠ NEGA BU EKRAN BOR. Kassa ilovasi (brauzer, desktop, telefon) yiqilsa,
   xato ilgari faqat kassirning ekranida qolardi. Endi u serverga keladi
   (`ek-errors.js`) va shu yerda ko'rinadi.

   ⚠ GURUHLAB, bitta-bitta emas. Buzilgan reliz yuzta kassada bir xil
   xatoni beradi — ro'yxatda yuz qator emas, «1 xato · 100 marta · 37
   do'kon» bo'lishi kerak. Guruh kaliti serverda (xabar + birinchi kod
   qatori, xesh va qator raqamisiz).

   ⚠ Do'kon kodi va login — ILOVA AYTGANI (so'rov tokensiz keladi):
   tashxis uchun, isbot emas.
   ══════════════════════════════════════════════════════════════════════════ */

const KIND_TONE = { render: "red", error: "red", rejection: "orange", chunk: "blue", other: "gray" };

export default function ClientErrorsPage({ toast }) {
  const { t } = useT();

  const [days, setDays] = useState("7");
  const [platform, setPlatform] = useState("");
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);

  const [open, setOpen] = useState(null);          // ochilgan guruh
  const [occ, setOcc] = useState({});              // fingerprint → holatlar
  const [occLoading, setOccLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days });
      if (platform) qs.set("platform", platform);
      const r = await clientErrorApi.groups(qs.toString());
      setData({ items: asArray(r.data?.items), total: r.data?.total ?? 0 });
    } catch (e) {
      toast.error(`${t("common.loadFailed")}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [days, platform]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggle = async (fp) => {
    if (open === fp) { setOpen(null); return; }
    setOpen(fp);
    if (occ[fp]) return;
    setOccLoading(fp);
    try {
      const r = await clientErrorApi.occurrences(fp);
      setOcc((prev) => ({ ...prev, [fp]: asArray(r.data) }));
    } catch (e) {
      toast.error(`${t("common.loadFailed")}: ${e.message}`);
    } finally {
      setOccLoading(null);
    }
  };

  const kindLabel = (k) => t(`cerr.kind.${k}`) === `cerr.kind.${k}` ? k : t(`cerr.kind.${k}`);
  const platformLabel = (p) => String(p || "").split(",").filter(Boolean)
    .map((x) => (t(`cerr.platform.${x}`) === `cerr.platform.${x}` ? x : t(`cerr.platform.${x}`))).join(", ");

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">{t("cerr.title")}</h1>
        <button className="btn btn-outline" onClick={load} disabled={busy}>
          <i className="fa-solid fa-rotate" aria-hidden="true" /> {t("common.refresh")}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>{t("cerr.hint")}</p>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={days} onChange={setDays} ariaLabel={t("cerr.period")} options={[
            { value: "1", label: t("cerr.days.1") },
            { value: "7", label: t("cerr.days.7") },
            { value: "30", label: t("cerr.days.30") },
          ]} />
          <Select value={platform} onChange={setPlatform} ariaLabel={t("cerr.col.platform")} options={[
            { value: "", label: t("cerr.platform.all") },
            { value: "web", label: t("cerr.platform.web") },
            { value: "desktop", label: t("cerr.platform.desktop") },
            { value: "android", label: t("cerr.platform.android") },
          ]} />
          {!busy && (
            <span className="muted">
              {t("cerr.summary", { groups: data.items.length, total: data.total })}
            </span>
          )}
        </div>

        {busy ? <SkeletonTable rows={6} cols={["wide", "num", "num", "text", "text", "text"]} /> :
          data.items.length === 0 ? (
            <Empty icon="fa-circle-check" title={t("cerr.empty")} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("cerr.col.error")}</th>
                    <th className="ta-right">{t("cerr.col.count")}</th>
                    <th className="ta-right">{t("cerr.col.shops")}</th>
                    <th>{t("cerr.col.platform")}</th>
                    <th>{t("cerr.col.version")}</th>
                    <th>{t("cerr.col.last")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((g) => (
                    <Fragment key={g.fingerprint}>
                      <tr onClick={() => toggle(g.fingerprint)} style={{ cursor: "pointer" }}
                          aria-expanded={open === g.fingerprint}>
                        <td>
                          <Badge color={KIND_TONE[g.kind] || "gray"}>{kindLabel(g.kind)}</Badge>{" "}
                          <strong>{g.message}</strong>
                          {g.path && <p className="muted ek-num" style={{ margin: 0 }}>{g.path}</p>}
                        </td>
                        <td className="ta-right ek-num">{g.count}</td>
                        <td className="ta-right ek-num" title={t("cerr.devices", { n: g.devices })}>{g.shops}</td>
                        <td>{platformLabel(g.platforms)}</td>
                        <td className="ek-num">{g.lastVersion || "—"}</td>
                        <td className="ek-num">{fmtDateTime(g.lastSeen)}</td>
                      </tr>
                      {open === g.fingerprint && (
                        <tr>
                          <td colSpan={6}>
                            {occLoading === g.fingerprint ? <Spinner /> : (
                              <Occurrences rows={occ[g.fingerprint] || []} t={t} platformLabel={platformLabel} />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

/** Guruhning oxirgi holatlari: kim, qayerda, qaysi versiya — va stack. */
function Occurrences({ rows, t, platformLabel }) {
  if (!rows.length) return <p className="muted">{t("cerr.noOcc")}</p>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p className="muted" style={{ margin: 0 }}>{t("cerr.occHint", { n: rows.length })}</p>
      {rows.map((o) => (
        <details key={o.id} className="card" style={{ margin: 0 }}>
          <summary style={{ cursor: "pointer", display: "flex", gap: 12, flexWrap: "wrap", minHeight: 44, alignItems: "center" }}>
            <span className="ek-num">{fmtDateTime(o.createdAt)}</span>
            <span>{o.shopCode || "—"}{o.username ? ` · ${o.username}` : ""}</span>
            <span>{platformLabel(o.platform)} <span className="ek-num">{o.version || ""}</span></span>
            <span className="muted ek-num">{o.path || ""}</span>
          </summary>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <p style={{ margin: 0 }}><strong>{o.message}</strong></p>
            {o.stack && <pre className="ek-num" style={preStyle}>{o.stack}</pre>}
            {o.componentStack && (
              <>
                <span className="muted">{t("cerr.componentStack")}</span>
                <pre className="ek-num" style={preStyle}>{o.componentStack.trim()}</pre>
              </>
            )}
            <span className="muted">{t("cerr.device")}: <span className="ek-num">{o.deviceId || "—"}</span></span>
            {o.userAgent && <span className="muted">{o.userAgent}</span>}
          </div>
        </details>
      ))}
    </div>
  );
}

const preStyle = {
  margin: 0, padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 280, overflow: "auto",
  whiteSpace: "pre-wrap", wordBreak: "break-word", background: "var(--bg-sunken)",
};
