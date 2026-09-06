import { useCallback, useEffect, useMemo, useState } from "react";
import { auditApi } from "../api";
import { fmtDateTime } from "../utils";
import { useT } from "../lib/ek-i18n";
import { Empty, Search, Badge } from "../components/ui";
import { AUDIT_ACTION, entry, options } from "../lib/ek-labels";
import Select from "../components/ek/Select";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import ExportButtons from "../components/ExportButtons";
import { isoDateTime } from "../utils/export";
import DataFilter, { useDataFilter, SortTh } from "../components/ek/DataFilter";

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

/* ⚠ RO'YXAT VA RANG ENDI `lib/ek-labels.js` DA (V81).

   Ilgari ikkalasi shu yerda, BITTA jadvalda edi va filtr o'sha
   jadvalning kalitlaridan qurilardi (`Object.keys(TONE)`). Ya'ni
   amalning filtrga tushishi uning RANGI borligiga bog'liq edi:
   rangsiz amal ro'yxatdan jimgina yo'qolardi.

   Natijada bu yerda 15 ta amal turardi, serverda esa 51 ta —
   `SALE_RETURN`, `CASH_MOVEMENT`, `TRANSFER_*` va hatto admin
   panelining o'z amallari (`ADMIN_CREATE`, `ADMIN_PASSWORD_RESET`)
   jurnalda ko'rinardi, lekin ularni TANLAB bo'lmasdi. Nazorat
   vositasi uchun eng yomon nosozlik: ma'lumot bor, unga yetib
   bo'lmaydi. */

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

  /* ══ USTUNLAR BO'YICHA FILTR (V68) ═══════════════════════════════════
     ⚠ Tepadagi «amal» va «kim» maydonlari SERVERGA ketadi (sahifalash
     bilan), bu esa KELGAN sahifani kesadi. Ikkalasi bir-birini
     almashtirmaydi: server bitta amalni bera oladi, bu yerda esa
     «uchta amaldan biri» va sana oralig'i ishlaydi. */
  const COLS = useMemo(() => [
    { key: "time",  label: t("audit.colTime"),    type: "date", get: (r) => r.createdAt },
    { key: "actor", label: t("audit.colActor"),   type: "text", get: (r) => r.actorUsername },
    { key: "act",   label: t("audit.colAction"),  type: "enum",
      /* ⚠ Ustun filtri ham AYNAN o'sha ro'yxatdan. Ilgari u ham rang
         jadvalidan qurilardi va yuqoridagi tanlov bilan birga qisqarardi:
         ikkala joyda ham bir xil 36 ta amal yo'q edi. */
      options: options(AUDIT_ACTION),
      get: (r) => r.action },
    { key: "sum",   label: t("audit.colSummary"), type: "text",
      get: (r) => `${r.summary || ""} ${r.details || ""}` },
    { key: "ip",    label: "IP",                  type: "text", get: (r) => r.ip },
  ], [t]);
  const colFlt = useDataFilter(COLS, "adm-audit");
  const shown = colFlt.apply(data.items || []);

  const exportHeaders = [
    t("audit.colTime"), t("audit.colActor"),
    t("audit.colAction"), t("audit.colSummary"), "IP",
  ];
  /* ⚠ EKSPORT — EKRANDAGI qatorlar (filtrlangan), xom sahifa emas:
     filtr qo'yib eksport bosgan odam o'zi ko'rgan ro'yxatni kutadi. */
  const exportRows = shown.map((row) => [
    isoDateTime(row.createdAt),
    // Ekranda ism va tur ikki qatorda turadi; faylda bitta katakda,
    // chunki CSV da "ikkinchi qator" degan tushuncha yo'q.
    `${row.actorUsername || "—"} (${t(`audit.actor.${row.actorType || "SYSTEM"}`)})`,
    entry(AUDIT_ACTION, row.action).label,
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
              /* ⚠ Ro'yxat 51 ta — `Select` sakkiztadan ko'pida qidiruvni
                 O'ZI yoqadi, ya'ni admin «qayt» deb yozib «Tovar
                 qaytarildi» ni topadi. Qisqartirish esa yana o'sha
                 nosozlikni qaytarardi: ko'rinmaydigan amal = yo'q amal. */
              options={[
                { value: "", label: t("audit.allActions"), icon: "fa-list" },
                ...options(AUDIT_ACTION).map((o) => ({
                  ...o, icon: AUDIT_ACTION[o.value]?.icon || "fa-angle-right",
                })),
              ]}
            />
            <Search value={actor} onChange={setActor}
              placeholder={t("audit.filterActor")} style={{ width:200 }} />
            <DataFilter cols={COLS} flt={colFlt} />
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
                  <SortTh flt={colFlt} col="time">{t("audit.colTime")}</SortTh>
                  <SortTh flt={colFlt} col="actor">{t("audit.colActor")}</SortTh>
                  <SortTh flt={colFlt} col="act">{t("audit.colAction")}</SortTh>
                  <SortTh flt={colFlt} col="sum">{t("audit.colSummary")}</SortTh>
                  <SortTh flt={colFlt} col="ip">IP</SortTh>
                </tr>
              </thead>
              <tbody>
                {shown.length > 0 ? shown.map(row => (
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
                      {/* ⚠ `entry()` NOMA'LUM qiymatda ham o'qiladigan matn
                          qaytaradi («Admin create»), xom kalit emas: server
                          yangi amal qo'shsa, jurnal shu zahoti buziladigan
                          ko'rinishga tushmasin. */}
                      <Badge color={entry(AUDIT_ACTION, row.action).color || "gray"}>
                        {entry(AUDIT_ACTION, row.action).label}
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
