import { useCallback, useEffect, useState } from "react";
import { contactApi } from "../api";
import { fmtDateTime } from "../utils";
import { useT } from "../lib/ek-i18n";
import Modal from "../components/Modal";
import { Empty, Badge, Avatar } from "../components/ui";
import { useConfirm } from "../context/ConfirmProvider";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";

/* ══════════════════════════════════════════════════════════════════════════
   Arizalar — landing sahifadagi "Demo so'rash" formasidan kelgan so'rovlar.

   NEGA BU EKRAN BOR:
   Backend ancha oldin tayyor edi — `POST /contact` ochiq, `GET /contact` va
   `PATCH /contact/{id}/handled` esa admin rollariga. Lekin panelda `/contact`
   ga bitta ham chaqiruv yo'q edi. Ya'ni landingdan kelgan har bir potensial
   mijoz bazaga tushib, HECH KIM O'QIMASDI.

   `00-OVERVIEW.md` ning asosiy o'lchov mezoni — "landing → demo so'rash
   konversiyasi ≥ 4%" — aynan shu nuqtada uzilardi: forma ishlaydi, lid
   saqlanadi, lekin unga hech qachon javob berilmaydi.

   Shuning uchun bu ekranning markazida jadval emas, HARAKAT turadi: telefon
   raqami bosiladigan havola (`tel:`), va "Bajarildi" tugmasi.
   ══════════════════════════════════════════════════════════════════════════ */

export default function RequestsPage({ toast }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);
  const [filter,  setFilter]  = useState("NEW");
  const [detail,  setDetail]  = useState(null);
  const [saving,  setSaving]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await contactApi.getAll()).data || []); }
    catch (e) { toast.error(`${t("common.loadFailed")}: ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    NEW:     items.filter(i => !i.handled).length,
    HANDLED: items.filter(i =>  i.handled).length,
    ALL:     items.length,
  };

  const filtered = items.filter(i =>
    filter === "ALL" ? true : filter === "NEW" ? !i.handled : i.handled
  );

  const handleMark = async (item) => {
    const ok = await confirm({
      title: t("req.markTitle"),
      // Ariza egasining ISMI tarjima qilinmaydi — u foydalanuvchi ma'lumoti
      message: t("req.markMsg", { name: item.fullName }),
      type: "info",
      confirmText: t("req.markHandled"),
    });
    if (!ok) return;
    setSaving(item.id);
    try {
      await contactApi.markHandled(item.id);
      toast.success(t("req.marked"));
      // Faqat shu satrni yangilaymiz — butun ro'yxatni qayta so'ramaymiz,
      // aks holda operator qayerda edi — o'sha joyni yo'qotadi.
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, handled: true } : x));
      setDetail(null);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(null); }
  };

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <div className="tabs" style={{ flexWrap:"wrap" }}>
            {[
              { k:"NEW",     l: t("req.tabNew",     { n: counts.NEW })     },
              { k:"HANDLED", l: t("req.tabHandled", { n: counts.HANDLED }) },
              { k:"ALL",     l: t("req.tabAll",     { n: counts.ALL })     },
            ].map(({ k, l }) => (
              <button key={k} className={`tab ${filter===k?"on":""}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={load}>
            <i className="fa-solid fa-rotate" aria-hidden="true" /> {t("common.refresh")}
          </button>
        </div>

        <p className="set-card__hint">{t("req.subtitle")}</p>

        <div className="tw">
          {busy ? <SkeletonTable rows={6} cols={["text", "wide", "text", "wide", "narrow"]} /> : (
            <table>
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("req.colClient")}</th>
                  <th>{t("common.phone")}</th>
                  <th>{t("req.colMessage")}</th>
                  <th>{t("common.status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(item => (
                  <tr key={item.id} style={{ opacity: item.handled ? 0.55 : 1 }}>
                    <td className="ek-num" style={{ fontSize:12, color:"var(--fg-secondary)", whiteSpace:"nowrap" }}>
                      {fmtDateTime(item.createdAt)}
                    </td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar name={item.fullName} size={30} radius={8} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700 }}>{item.fullName}</div>
                          {item.shopName && (
                            <div style={{ fontSize:11, color:"var(--fg-secondary)" }}>{item.shopName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {/* Bu ekrandagi ASOSIY harakat — qo'ng'iroq qilish.
                          Shuning uchun raqam matn emas, bosiladigan havola. */}
                      <a className="ek-num" href={`tel:${item.phone}`}
                         title={t("req.call")}
                         style={{ fontWeight:700, whiteSpace:"nowrap" }}>
                        {item.phone}
                      </a>
                    </td>
                    <td style={{ fontSize:12, color:"var(--fg-secondary)", maxWidth:280 }}>
                      {item.message ? (
                        <button type="button" className="req-msg" onClick={() => setDetail(item)}>
                          {item.message}
                        </button>
                      ) : (
                        <span style={{ fontStyle:"italic" }}>{t("req.noMessage")}</span>
                      )}
                    </td>
                    <td>
                      <Badge color={item.handled ? "green" : "yellow"}>
                        {t(item.handled ? "req.handled" : "req.new")}
                      </Badge>
                    </td>
                    <td>
                      {!item.handled && (
                        <button className="btn btn-sm btn-primary"
                                disabled={saving === item.id}
                                onClick={() => handleMark(item)}>
                          {saving === item.id
                            ? <><Spinner /> {t("common.saving")}</>
                            : <><i className="fa-solid fa-check" aria-hidden="true" /> {t("req.markHandled")}</>}
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}>
                    <Empty icon="fa-inbox" title={t("req.none")} subtitle={t("req.noneHint")} />
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detail && (
        <Modal title={t("req.detail", { name: detail.fullName })} onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setDetail(null)}>
                {t("common.close")}
              </button>
              <a className="btn btn-primary btn-sm" href={`tel:${detail.phone}`}>
                <i className="fa-solid fa-phone" aria-hidden="true" /> {t("req.call")}
              </a>
            </>
          }>
          <div className="set-list">
            <div className="set-row">
              <div className="set-row__text"><div className="set-row__label">{t("common.phone")}</div></div>
              <div className="set-row__control">
                <a className="set-value ek-num" href={`tel:${detail.phone}`}>{detail.phone}</a>
              </div>
            </div>
            {detail.shopName && (
              <div className="set-row">
                <div className="set-row__text"><div className="set-row__label">{t("req.shopName")}</div></div>
                <div className="set-row__control"><span className="set-value">{detail.shopName}</span></div>
              </div>
            )}
            <div className="set-row">
              <div className="set-row__text"><div className="set-row__label">{t("common.date")}</div></div>
              <div className="set-row__control">
                <span className="set-value ek-num">{fmtDateTime(detail.createdAt)}</span>
              </div>
            </div>
          </div>
          <p style={{ margin:"4px 18px 16px", fontSize:13.5, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
            {detail.message || t("req.noMessage")}
          </p>
        </Modal>
      )}
    </div>
  );
}
