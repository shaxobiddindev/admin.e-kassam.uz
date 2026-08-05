import { useCallback, useEffect, useState } from "react";
import { auditApi } from "../api";
import { fmtDateTime } from "../utils";
import { useT } from "../lib/ek-i18n";
import { Empty, Search, Badge } from "../components/ui";
import Select from "../components/ek/Select";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import ExportButtons from "../components/ExportButtons";
import { isoDateTime } from "../utils/export";

/* ══════════════════════════════════════════════════════════════════════════
   Audit jurnali — kim, nima qildi va qachon.

   NEGA BU EKRAN BOR:
   `07-ADMIN.md` audit jurnalini talab qilardi, backenddagi
   `config/audit/AuditConfig.java` esa BO'SH sinf edi. Ya'ni do'kon
   o'chirish, parol almashtirish, xodim bloklash — hech qayerda iz
   qoldirmasdi. Endi to'lovlar ham borligi uchun bu moliyaviy masala:
   "bu to'lovni kim kiritdi?" degan savolga javob bo'lishi shart.

   FAQAT O'QISH. Jurnalni tahrirlaydigan yoki tozalaydigan tugma yo'q va
   bo'lmasligi kerak — o'zgartirilishi mumkin bo'lgan jurnal audit emas.

   Sahifalash MAJBURIY: jurnal cheksiz o'sadi va uni to'liq yuklash bir
   yildan keyin panelni yiqitardi.
   ══════════════════════════════════════════════════════════════════════════ */

/** Amal turiga qarab ohang — rang yolg'iz signal emas, yonida matn ham bor. */
const TONE = {
  SHOP_DELETE:          "red",
  USER_DELETE:          "red",
  USER_BLOCK:           "red",
  SUBSCRIPTION_EXPIRED: "red",
  USER_PASSWORD_CHANGE: "yellow",
  SHOP_STATUS_CHANGE:   "yellow",
  IMPERSONATE:          "yellow",
  PAYMENT_REGISTER:     "green",
  USER_UNBLOCK:         "green",
  SHOP_CREATE:          "green",
  USER_CREATE:          "green",
  CONTACT_HANDLED:      "blue",
  ADMIN_LOGIN:          "gray",
  SHOP_UPDATE:          "gray",
  USER_UPDATE:          "gray",
};

const ACTIONS = Object.keys(TONE);

export default function AuditPage({ toast }) {
  const { t } = useT();
  const [data,    setData]    = useState({ items: [], page: 0, totalPages: 0, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);
  const [action,  setAction]  = useState("");
  const [actor,   setActor]   = useState("");
  const [page,    setPage]    = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), size: "50" });
    if (action) params.set("action", action);
    if (actor.trim()) params.set("actor", actor.trim());

    auditApi.search(params.toString())
      .then(r => setData(r.data || { items: [] }))
      .catch(e => toast.error(`${t("common.loadFailed")}: ${e.message}`))
      .finally(() => setLoading(false));
  }, [action, actor, page]);

  // Filtr o'zgarsa birinchi sahifaga qaytamiz — aks holda 5-sahifada
  // turib filtr qo'ysangiz bo'sh ro'yxat chiqib, "hech narsa yo'q" deb
  // o'ylab qolasiz.
  useEffect(() => { setPage(0); }, [action, actor]);
  useEffect(() => {
    const id = setTimeout(load, actor ? 300 : 0);
    return () => clearTimeout(id);
  }, [load]);

  const exportHeaders = [
    t("audit.colTime"), t("audit.colActor"),
    t("audit.colAction"), t("audit.colSummary"), "IP",
  ];
  const exportRows = (data.items || []).map((row) => [
    isoDateTime(row.createdAt),
    // Ekranda ism va tur ikki qatorda turadi; faylda bitta katakda,
    // chunki CSV da "ikkinchi qator" degan tushuncha yo'q.
    `${row.actorUsername || "—"} (${t(`audit.actor.${row.actorType || "SYSTEM"}`)})`,
    t(`enum.audit.${row.action}`),
    [row.summary, row.details].filter(Boolean).join(" — "),
    row.ip || "",
  ]);

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <span className="c-title">
            <i className="fa-solid fa-clipboard-list" aria-hidden="true" /> {t("audit.title")}
          </span>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Select
              variant="field" ariaLabel={t("audit.colAction")}
              value={action} onChange={setAction}
              options={[
                { value: "", label: t("audit.allActions"), icon: "fa-list" },
                ...ACTIONS.map(a => ({ value: a, label: t(`enum.audit.${a}`), icon: "fa-angle-right" })),
              ]}
            />
            <Search value={actor} onChange={setActor}
              placeholder={t("audit.filterActor")} style={{ width:200 }} />
            {/* ⚠ Eksport JORIY SAHIFANI oladi (50 qator), butun jurnalni emas:
                jurnal cheksiz o'sadi va uni to'liq yuklash panelni yiqitardi.
                Butun jurnal kerak bo'lsa — bazadan, filtr bilan. */}
            <ExportButtons name={`audit-${data.page + 1}`}
                           headers={exportHeaders} rows={exportRows} toast={toast} />
          </div>
        </div>

        <p className="set-card__hint">{t("audit.subtitle")}</p>

        <div className="tw">
          {busy ? <SkeletonTable rows={8} cols={["text", "text", "text", "wide", "narrow"]} /> : (
            <table>
              <thead>
                <tr>
                  <th>{t("audit.colTime")}</th>
                  <th>{t("audit.colActor")}</th>
                  <th>{t("audit.colAction")}</th>
                  <th>{t("audit.colSummary")}</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.length > 0 ? data.items.map(row => (
                  <tr key={row.id}>
                    <td className="ek-num" style={{ fontSize:11, whiteSpace:"nowrap", color:"var(--fg-secondary)" }}>
                      {fmtDateTime(row.createdAt)}
                    </td>
                    <td style={{ fontSize:12 }}>
                      <div style={{ fontWeight:700 }}>{row.actorUsername || "—"}</div>
                      <div style={{ fontSize:10, color:"var(--fg-secondary)" }}>
                        {t(`audit.actor.${row.actorType || "SYSTEM"}`)}
                      </div>
                    </td>
                    <td>
                      <Badge color={TONE[row.action] || "gray"}>
                        {t(`enum.audit.${row.action}`)}
                      </Badge>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {/* Tavsif jurnalga YOZILGAN paytdagi matn — tarjima
                          kalitiga bog'lanmagan. Audit o'sha ondagi holatni
                          saqlashi kerak, keyingi lug'at o'zgarishlarini emas. */}
                      <div>{row.summary}</div>
                      {row.details && (
                        <div className="ek-num" style={{ fontSize:10, color:"var(--fg-secondary)", marginTop:2 }}>
                          {row.details}
                        </div>
                      )}
                    </td>
                    <td className="ek-num" style={{ fontSize:11, color:"var(--fg-secondary)" }}>
                      {row.ip || "—"}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>
                    <Empty icon="fa-clipboard-list" title={t("audit.none")} subtitle={t("audit.noneHint")} />
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {data.totalPages > 1 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        gap:12, padding:"12px 18px", borderTop:"1px solid var(--border-subtle)" }}>
            <span style={{ fontSize:12, color:"var(--fg-secondary)" }}>
              {t("audit.total", { n: data.totalItems })}
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button className="btn btn-outline btn-sm" disabled={page <= 0}
                      onClick={() => setPage(p => Math.max(0, p - 1))}>
                <i className="fa-solid fa-chevron-left" aria-hidden="true" /> {t("common.back")}
              </button>
              <span className="ek-num" style={{ fontSize:12, fontWeight:700 }}>
                {t("audit.pageOf", { page: data.page + 1, total: data.totalPages })}
              </span>
              <button className="btn btn-outline btn-sm" disabled={page >= data.totalPages - 1}
                      onClick={() => setPage(p => p + 1)}>
                {t("common.next")} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
