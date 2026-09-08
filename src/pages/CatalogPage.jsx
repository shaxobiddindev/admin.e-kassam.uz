import { useCallback, useEffect, useMemo, useState } from "react";
import { catalogApi } from "../api";
import { fmtDateTime } from "../utils";
import { useT } from "../lib/ek-i18n";
import Modal from "../components/Modal";
import Select from "../components/ek/Select";
import { Empty, Badge, FG } from "../components/ui";
import { useConfirm } from "../context/ConfirmProvider";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { asArray } from "../lib/ek-array";
import {
  BUSINESS_TYPE, GLOBAL_STATUS, UNIT, MARKING_GROUP,
  businessType, globalStatus, unitLabel, options,
} from "../lib/ek-labels";
import { BarcodeField, MxikField } from "../components/ek/EkFields";
import { barcodeSuspicious } from "../lib/ek-barcode-check";

/* ══════════════════════════════════════════════════════════════════════════
   UMUMIY KATALOG — ADMIN EKRANI (V90)

   ═══ NEGA BU EKRAN BOR ════════════════════════════════════════════════

   Umumiy katalog — barcha do'konlar uchun BITTA tovar bazasi: nom,
   shtrix-kod, birlik, MXIK. Do'kon uni o'z katalogiga oladi va
   ustiga faqat o'ziniki bo'lgan narsani (narx, qoldiq) qo'shadi.

   Do'kon bazada yo'q tovarni taklif qila oladi. Lekin taklif DARHOL
   hammaga tarqalmaydi: avval shu yerda tasdiqlanadi. Tasdiqsiz uni
   faqat taklif qilgan do'kon va admin ko'radi.

   ⚠ SHU EKRAN BO'LMASA butun tizim to'xtaydi: takliflar bazaga
   tushaveradi va hech kim ularni ko'rmaydi — ya'ni do'kon uchun
   «yubordim, javob yo'q» degani bo'lardi. Shuning uchun ekran
   TASDIQ KUTAYOTGANLAR bilan ochiladi, butun ro'yxat bilan emas.

   ═══ NIMA YO'Q VA NEGA ════════════════════════════════════════════════

   ⚠ TOVARNI O'CHIRISH TUGMASI YO'Q. Yozuvni do'konlar allaqachon o'z
   katalogiga olgan bo'lishi mumkin — o'chirish ularning tovarini
   egasiz qoldirardi. O'rniga «Faol» bayrog'i: o'chirilgan yozuv
   yangi importlarda ko'rinmaydi, olganlarda esa joyida qoladi.
   ══════════════════════════════════════════════════════════════════════════ */

/** Bo'sh matnni `null` ga aylantiradi — server bo'sh satrni saqlamasin. */
const nz = (v) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};

export default function CatalogPage({ toast }) {
  const { t } = useT();
  const [tab, setTab]         = useState("products");
  const [cats, setCats]       = useState([]);
  const [pending, setPending] = useState(0);

  /* Kategoriyalar IKKALA bo'limga ham kerak (tovar filtri va ro'yxat),
     shuning uchun ular shu yerda — bo'lim almashganda qayta so'ralmaydi. */
  const loadCats = useCallback(async () => {
    try { setCats(asArray((await catalogApi.categories()).data)); }
    catch (e) { toast.error(`${t("common.loadFailed")}: ${e.message}`); }
  }, []);

  const loadPending = useCallback(async () => {
    try { setPending(Number((await catalogApi.pendingCount()).data) || 0); }
    catch (_) { /* Sanoq — bezak. U kelmasa ham ekran ishlaydi. */ }
  }, []);

  useEffect(() => { loadCats(); loadPending(); }, [loadCats, loadPending]);

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <button className={`tab ${tab === "products" ? "on" : ""}`}
                onClick={() => setTab("products")}>
          {t("adm.catalog.tabProducts")}
          {/* Tasdiq kutayotganlar soni — bo'limga kirmasdan ko'rinsin. */}
          {pending > 0 && <span className="ek-num" style={{ marginInlineStart: 6 }}>({pending})</span>}
        </button>
        <button className={`tab ${tab === "cats" ? "on" : ""}`}
                onClick={() => setTab("cats")}>
          {t("adm.catalog.tabCategories")}
        </button>
      </div>

      {tab === "products"
        ? <ProductsTab toast={toast} cats={cats} onModerated={loadPending} />
        : <CategoriesTab toast={toast} cats={cats} onChanged={loadCats} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TOVARLAR
   ══════════════════════════════════════════════════════════════════════════ */

function ProductsTab({ toast, cats, onModerated }) {
  const { t } = useT();
  const confirm = useConfirm();

  /* ⚠ Standart filtr — «tasdiq kutmoqda». Ro'yxat butun katalog bilan
     ochilsa, kutayotgan beshta taklif minglab yozuv orasida yo'qolardi
     va aynan shu — bu ekranning asosiy ishi. */
  const [status, setStatus] = useState("PENDING");
  const [type,   setType]   = useState("");
  const [cat,    setCat]    = useState("");
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(0);

  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(0);
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);
  const [acting, setActing] = useState(null);
  const [form,   setForm]   = useState(null);   // null | {} | row
  const [reject, setReject] = useState(null);   // rad etish oynasi
  /* Tasdiqlashdan oldin ko'rsatiladigan dublikat ro'yxati. */
  const [dupes,  setDupes]  = useState(null);   // null | { row, rows }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await catalogApi.products({
        status: status || undefined,
        businessType: type || undefined,
        categoryId: cat || undefined,
        search: search.trim() || undefined,
        page,
      });
      setRows(asArray(res.data));
      setTotal(Number(res.data?.totalElements) || 0);
      setPages(Number(res.data?.totalPages) || 0);
    } catch (e) { toast.error(`${t("common.loadFailed")}: ${e.message}`); }
    finally { setLoading(false); }
  }, [status, type, cat, search, page]);

  useEffect(() => { load(); }, [load]);

  /* Filtr o'zgarsa birinchi sahifaga qaytamiz: 7-sahifada turib filtrni
     almashtirgan odam bo'sh ro'yxat ko'rardi va uni xato deb o'ylardi. */
  const setFilter = (fn) => (v) => { fn(v); setPage(0); };

  /* ══ BIRLASHTIRISH ═══════════════════════════════════════════════
     ⚠ O'CHIRISH EMAS. Manba satri qoladi va nishonga
     yo'naltiriladi; uni olgan do'konlarning tovarlari umuman
     o'zgarmaydi — ular do'konning o'z ma'lumoti. Katalogdan esa
     manba yo'qoladi, ya'ni dublikat qaytadan tug'ilmaydi.

     ⚠ TASDIQLASH EMAS: birlashtirilgan yozuv katalogga chiqmaydi,
     shuning uchun uni tasdiqlashning ma'nosi ham yo'q. */
  const doMerge = async (row, targetId) => {
    setActing(row.id);
    try {
      await catalogApi.merge(row.id, targetId);
      toast.success(t("adm.catalog.merged"));
      await load();
      onModerated();
    } catch (e) { toast.error(e.message); }
    finally { setActing(null); setDupes(null); }
  };

  /** Tasdiqlashning o'zi — tasdiq olingandan keyin. */
  const doApprove = async (row) => {
    setActing(row.id);
    try {
      await catalogApi.approve(row.id);
      toast.success(t("adm.catalog.approved"));
      await load();
      onModerated();
    } catch (e) { toast.error(e.message); }
    finally { setActing(null); setDupes(null); }
  };

  /* ══ TASDIQLASHDAN OLDIN: DUBLIKAT BORMI ═══════════════════════════
     ⚠ NEGA AYNAN SHU YERDA. Umumiy bazada yagonalik faqat aniq
     shtrix-kod bo'yicha. Ya'ni «Coca-Cola 0.5» va «Кока-Кола 0,5 л»
     bir raqami xato terilgan barkod bilan bemalol yonma-yon
     yashaydi. Moderator ularni boshqa-boshqa kunlarda ko'radi —
     ikkalasini ham tasdiqlaydi va katalogda bitta ichimlik ikkita
     bo'lib qoladi. Savol qaror qabul qilinadigan JOYDA turishi kerak.

     ⚠ QAROR ODAMNIKI. «Boshqa hajmdagi shu ichimlik» bilan «o'sha
     ichimlikning xato yozilgani» ni faqat odam ajrata oladi.

     ⚠ Qidiruv XATOSI tasdiqlashni TO'SMAYDI: o'xshashlik yordamchi
     xususiyat (serverda `pg_trgm` bo'lmasa u umuman ishlamaydi) va
     uning tufayli moderatsiya to'xtab qolishi mumkin emas. */
  const approve = async (row) => {
    let similar = [];
    try { similar = asArray((await catalogApi.similar(row.id)).data); }
    catch (_) { /* yordamchi — jim o'tamiz */ }

    if (similar.length > 0) { setDupes({ row, rows: similar }); return; }

    const ok = await confirm({
      title: t("adm.catalog.approveTitle"),
      message: t("adm.catalog.approveMsg", { name: row.name }),
      type: "info",
      confirmText: t("adm.catalog.approve"),
    });
    if (!ok) return;
    await doApprove(row);
  };

  const catOptions = useMemo(() => [
    { value: "", label: t("adm.catalog.allCategories"), icon: "fa-layer-group" },
    ...cats.map((c) => ({ value: String(c.id), label: c.name, icon: "fa-tag" })),
  ], [cats, t]);

  return (
    <div className="card">
      <div className="c-head">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Select variant="compact" ariaLabel={t("common.status")}
                  value={status} onChange={setFilter(setStatus)}
                  options={[
                    { value: "PENDING",  label: globalStatus("PENDING").label,  icon: "fa-hourglass-half" },
                    { value: "VERIFIED", label: globalStatus("VERIFIED").label, icon: "fa-circle-check" },
                    { value: "REJECTED", label: globalStatus("REJECTED").label, icon: "fa-circle-xmark" },
                    { value: "",         label: t("adm.catalog.allStatuses"),   icon: "fa-list" },
                  ]} />
          <Select variant="compact" ariaLabel={t("adm.catalog.fieldType")}
                  value={type} onChange={setFilter(setType)}
                  options={[
                    { value: "", label: t("adm.catalog.allTypes"), icon: "fa-store" },
                    ...options(BUSINESS_TYPE).map((o) => ({ ...o, icon: BUSINESS_TYPE[o.value]?.icon })),
                  ]} />
          <Select variant="compact" searchable ariaLabel={t("adm.catalog.fieldCategory")}
                  value={cat} onChange={setFilter(setCat)} options={catOptions} />
          <input className="fi" style={{ maxWidth: 220 }}
                 placeholder={t("adm.catalog.searchPlaceholder")}
                 value={search}
                 onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={load}>
            <i className="fa-solid fa-rotate" aria-hidden="true" /> {t("common.refresh")}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setForm({})}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> {t("adm.catalog.addProduct")}
          </button>
        </div>
      </div>

      <p className="set-card__hint">{t("adm.catalog.subtitle")}</p>

      <div className="tw">
        {busy ? <SkeletonTable rows={8} cols={["text", "wide", "text", "text", "narrow", "narrow"]} /> : (
          <table>
            <thead>
              <tr>
                <th>{t("adm.catalog.colBarcode")}</th>
                <th>{t("adm.catalog.colName")}</th>
                <th>{t("adm.catalog.fieldCategory")}</th>
                <th>{t("adm.catalog.colSource")}</th>
                <th>{t("adm.catalog.colImports")}</th>
                <th>{t("common.status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((r) => (
                <tr key={r.id} style={{ opacity: r.active === false ? 0.5 : 1 }}>
                  {/* ══ NAZORAT RAQAMI BAYROG'I ═══════════════════════
                      Xato terilgan barkod tasdiqlansa, u yuzlab
                      do'konga tarqaladi va ularning hech birida
                      skaner tovarni topa olmaydi. Nazorat raqami
                      buni bepul ushlaydi.

                      ⚠ Bayroq SERVERDAN keladi (`barcodeIssue`) —
                      qoida bitta joyda. Ichki kod va artikul hech
                      qachon belgilanmaydi: ular qonuniy va ularni
                      belgilash bayroqni foydasiz qilardi. */}
                  <td className="ek-num" style={{ whiteSpace: "nowrap" }}>
                    {r.barcode}
                    {r.barcodeIssue === "CHECK_DIGIT" && (
                      <div style={{ fontSize: 11, color: "var(--fg-warning)", fontWeight: 700 }}>
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{" "}
                        {t("adm.catalog.barcodeSuspect")}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                      {[r.brand, unitLabel(r.unit), r.businessType ? businessType(r.businessType).label : null]
                        .filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.categoryName || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                    {/* Kim taklif qilgani — tasdiq qaroriga kerak: bir
                        do'kondan ketma-ket axlat kelsa shu yerda ko'rinadi. */}
                    {r.createdByShopName || r.createdByShopCode || t("adm.catalog.byAdmin")}
                    <div className="ek-num" style={{ fontSize: 11 }}>{fmtDateTime(r.createdAt)}</div>
                  </td>
                  <td className="ek-num">{r.importCount ?? 0}</td>
                  <td>
                    <Badge color={r.status === "VERIFIED" ? "green" : r.status === "REJECTED" ? "red" : "yellow"}>
                      {globalStatus(r.status).label}
                    </Badge>
                    {/* ⚠ «Birlashtirilgan» «yashirilgan» dan OLDIN: har
                        birlashtirilgan yozuv ayni paytda yashirilgan
                        ham va ikkala yozuvni ko'rsatish qatorni
                        chalkashtirardi. Sabab muhimroq. */}
                    {r.mergedIntoId ? (
                      <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                        <i className="fa-solid fa-code-merge" aria-hidden="true" />{" "}
                        {t("adm.catalog.mergedInto")}: {r.mergedIntoName}
                      </div>
                    ) : r.active === false && (
                      <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                        {t("adm.catalog.hidden")}
                      </div>
                    )}
                    {r.status === "REJECTED" && r.rejectedReason && (
                      <div style={{ fontSize: 11, color: "var(--fg-secondary)", maxWidth: 200 }}>
                        {r.rejectedReason}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {r.status !== "VERIFIED" && (
                        <button className="btn btn-sm btn-primary" disabled={acting === r.id}
                                onClick={() => approve(r)}>
                          {acting === r.id
                            ? <><Spinner /> {t("common.saving")}</>
                            : <><i className="fa-solid fa-check" aria-hidden="true" /> {t("adm.catalog.approve")}</>}
                        </button>
                      )}
                      {r.status !== "REJECTED" && (
                        <button className="btn btn-sm btn-outline" disabled={acting === r.id}
                                onClick={() => setReject(r)}>
                          <i className="fa-solid fa-ban" aria-hidden="true" /> {t("adm.catalog.reject")}
                        </button>
                      )}
                      <button className="btn btn-sm btn-outline" onClick={() => setForm(r)}>
                        <i className="fa-solid fa-pen" aria-hidden="true" /> {t("common.edit")}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}>
                  <Empty icon="fa-boxes-stacked"
                         title={t(status === "PENDING" ? "adm.catalog.noPending" : "adm.catalog.none")}
                         subtitle={t(status === "PENDING" ? "adm.catalog.noPendingHint" : "adm.catalog.noneHint")} />
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", padding: 12 }}>
          <span style={{ fontSize: 12, color: "var(--fg-secondary)" }} className="ek-num">
            {t("adm.catalog.pageOf", { page: page + 1, pages, total })}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}>
            <i className="fa-solid fa-chevron-left" aria-hidden="true" /> {t("common.prev")}
          </button>
          <button className="btn btn-outline btn-sm" disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}>
            {t("common.next")} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      )}

      {form && (
        <ProductModal row={form.id ? form : null} cats={cats} toast={toast}
                      onClose={() => setForm(null)}
                      onSaved={() => { setForm(null); load(); onModerated(); }} />
      )}

      {dupes && (
        <DupeModal data={dupes} busy={acting === dupes.row.id}
                   onClose={() => setDupes(null)}
                   onApprove={() => doApprove(dupes.row)}
                   onMerge={(targetId) => doMerge(dupes.row, targetId)} />
      )}

      {reject && (
        <RejectModal row={reject} toast={toast}
                     onClose={() => setReject(null)}
                     onDone={() => { setReject(null); load(); onModerated(); }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DUBLIKAT SO'ROVI — TASDIQLASHDAN OLDIN

   ⚠ RO'YXAT «BULAR DUBLIKAT» DEMAYDI. U «bularga o'xshaydi» deydi.
   O'xshashlik foizi ham ATAYLAB ko'rsatilmaydi: raqam chiqsa, odam
   o'z qaroridan ko'ra raqamga ishonib qolardi va «0.91» bilan
   «0.89» orasida ma'no izlardi. Ro'yxat allaqachon eng o'xshashidan
   boshlab tartiblangan.

   ⚠ «Baribir tasdiqlash» tugmasi BOR va u birinchi emas: ko'p
   holatda o'xshash yozuv haqiqatan boshqa tovar (boshqa hajm,
   boshqa ta'm) va uni to'sish moderatsiyani to'xtatib qo'yardi.
   ══════════════════════════════════════════════════════════════════════════ */
function DupeModal({ data, busy, onClose, onApprove, onMerge }) {
  const { t } = useT();
  const confirm = useConfirm();
  const { row, rows } = data;

  /* ⚠ Birlashtirish TASDIQ SO'RAYDI: u import izlarini ko'chiradi va
     ortga qaytarish yo'li yo'q. Tasdiq matnida ikkala nom ham
     turadi — «qaysi biri qoladi» degan savol eng ko'p uchraydigan
     xato manbai. */
  const merge = async (target) => {
    const ok = await confirm({
      title: t("adm.catalog.mergeTitle"),
      message: t("adm.catalog.mergeMsg", { from: row.name, to: target.name }),
      type: "warning",
      confirmText: t("adm.catalog.merge"),
    });
    if (ok) onMerge(target.id);
  };

  return (
    <Modal size="md" title={t("adm.catalog.dupeTitle")} onClose={onClose}
           footer={
             <>
               <button className="btn btn-outline btn-sm" onClick={onClose}>
                 {t("common.cancel")}
               </button>
               <button className="btn btn-primary btn-sm" onClick={onApprove} disabled={busy}>
                 {busy ? <><Spinner /> {t("common.saving")}</>
                       : <><i className="fa-solid fa-check" aria-hidden="true" /> {t("adm.catalog.approveAnyway")}</>}
               </button>
             </>
           }>
      <p className="set-card__hint">{t("adm.catalog.dupeHint")}</p>

      <div className="set-list">
        <div className="set-row">
          <div className="set-row__text">
            <div className="set-row__label">{row.name}</div>
            <div className="set-row__hint ek-num">{row.barcode}</div>
          </div>
          <div className="set-row__control">
            <Badge color="yellow">{t("adm.catalog.dupeNew")}</Badge>
          </div>
        </div>

        {rows.map((r) => (
          <div className="set-row" key={r.id}>
            <div className="set-row__text">
              <div className="set-row__label">{r.name}</div>
              <div className="set-row__hint">
                <span className="ek-num">{r.barcode}</span>
                {r.categoryName && <> · {r.categoryName}</>}
                {r.createdByShopCode && <> · {r.createdByShopCode}</>}
              </div>
            </div>
            <div className="set-row__control" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge color={r.status === "VERIFIED" ? "green" : r.status === "REJECTED" ? "red" : "yellow"}>
                {globalStatus(r.status).label}
              </Badge>
              {/* «Bunisiga birlashtir» — yangi yozuv shu qatorga
                  yo'naltiriladi va katalogdan yo'qoladi. */}
              <button className="btn btn-sm btn-outline" disabled={busy}
                      title={t("adm.catalog.mergeHint")}
                      onClick={() => merge(r)}>
                <i className="fa-solid fa-code-merge" aria-hidden="true" /> {t("adm.catalog.merge")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RAD ETISH — SABAB BILAN

   ⚠ Sabab do'konga KO'RINADI. Sababsiz rad etish do'konga «nimadir
   noto'g'ri» degandan boshqa hech narsa aytmaydi va u xuddi shu
   tovarni yana yuboradi — ya'ni admin ishi ikki barobar bo'ladi.
   ══════════════════════════════════════════════════════════════════════════ */
function RejectModal({ row, toast, onClose, onDone }) {
  const { t } = useT();
  const [reason, setReason] = useState(row.rejectedReason || "");
  const [saving, setSaving] = useState(false);

  const send = async () => {
    setSaving(true);
    try {
      await catalogApi.reject(row.id, reason.trim());
      toast.success(t("adm.catalog.rejected"));
      onDone();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t("adm.catalog.rejectTitle", { name: row.name })} onClose={onClose}
           footer={
             <>
               <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
               <button className="btn btn-danger btn-sm" onClick={send} disabled={saving}>
                 {saving ? <><Spinner /> {t("common.saving")}</>
                         : <><i className="fa-solid fa-ban" aria-hidden="true" /> {t("adm.catalog.reject")}</>}
               </button>
             </>
           }>
      <FG label={t("adm.catalog.rejectReason")} hint={t("adm.catalog.rejectReasonHint")}>
        <textarea className="fi" rows={3} maxLength={500} autoFocus
                  value={reason} onChange={(e) => setReason(e.target.value)} />
      </FG>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TOVAR FORMASI — YARATISH VA TAHRIRLASH
   ══════════════════════════════════════════════════════════════════════════ */
function ProductModal({ row, cats, toast, onClose, onSaved }) {
  const { t } = useT();
  const [form, setForm] = useState({
    barcode: row?.barcode || "",
    name: row?.name || "",
    brand: row?.brand || "",
    unit: row?.unit || "DONA",
    mxikCode: row?.mxikCode || "",
    packageCode: row?.packageCode || "",
    markingGroup: row?.markingGroup || "",
    businessType: row?.businessType || "",
    categoryId: row?.categoryId ? String(row.categoryId) : "",
    active: row ? row.active !== false : true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.barcode.trim() || !form.name.trim()) {
      toast.error(t("adm.catalog.required")); return;
    }
    setSaving(true);
    try {
      const payload = {
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        brand: nz(form.brand),
        unit: nz(form.unit),
        mxikCode: nz(form.mxikCode),
        packageCode: nz(form.packageCode),
        markingGroup: nz(form.markingGroup),
        businessType: nz(form.businessType),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        active: form.active,
      };
      if (row) await catalogApi.editProduct(row.id, payload);
      else     await catalogApi.addProduct(payload);
      toast.success(t(row ? "adm.catalog.saved" : "adm.catalog.created"));
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal size="md" onClose={onClose}
           title={t(row ? "adm.catalog.editTitle" : "adm.catalog.createTitle", { name: row?.name })}
           footer={
             <>
               <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
               <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                 {saving ? <><Spinner /> {t("common.saving")}</>
                         : <><i className="fa-solid fa-check" aria-hidden="true" /> {t("common.save")}</>}
               </button>
             </>
           }>
      <div className="g2">
        <FG label={`${t("adm.catalog.colBarcode")} *`}
            hint={barcodeSuspicious(form.barcode)
                    ? t("adm.catalog.barcodeSuspectHint")
                    : t("adm.catalog.barcodeHint")}>
          <BarcodeField className="fi ek-num" value={form.barcode} onChange={setE("barcode")} autoFocus />
        </FG>
        <FG label={t("adm.catalog.fieldUnit")}>
          <Select block variant="field" ariaLabel={t("adm.catalog.fieldUnit")}
                  value={form.unit} onChange={set("unit")}
                  options={options(UNIT).map((o) => ({ ...o, icon: UNIT[o.value]?.icon }))} />
        </FG>
      </div>

      <FG label={`${t("adm.catalog.colName")} *`} hint={t("adm.catalog.nameHint")}>
        <input className="fi" value={form.name} onChange={setE("name")} maxLength={255} />
      </FG>

      <div className="g2">
        <FG label={t("adm.catalog.fieldBrand")}>
          <input className="fi" value={form.brand} onChange={setE("brand")} maxLength={120} />
        </FG>
        <FG label={t("adm.catalog.fieldType")} hint={t("adm.catalog.typeHint")}>
          <Select block variant="field" ariaLabel={t("adm.catalog.fieldType")}
                  value={form.businessType} onChange={set("businessType")}
                  options={[
                    { value: "", label: t("adm.catalog.anyType"), icon: "fa-globe" },
                    ...options(BUSINESS_TYPE).map((o) => ({ ...o, icon: BUSINESS_TYPE[o.value]?.icon })),
                  ]} />
        </FG>
      </div>

      <FG label={t("adm.catalog.fieldCategory")}>
        <Select block variant="field" searchable ariaLabel={t("adm.catalog.fieldCategory")}
                value={form.categoryId} onChange={set("categoryId")}
                options={[
                  { value: "", label: t("adm.catalog.noCategory"), icon: "fa-minus" },
                  ...cats.filter((c) => c.active !== false)
                         .map((c) => ({ value: String(c.id), label: c.name, icon: "fa-tag" })),
                ]} />
      </FG>

      <div className="g2">
        <FG label={t("adm.catalog.fieldMxik")} hint={t("adm.catalog.mxikHint")}>
          <MxikField className="fi ek-num" value={form.mxikCode} onChange={setE("mxikCode")} />
        </FG>
        <FG label={t("adm.catalog.fieldPackage")}>
          <input className="fi ek-num" value={form.packageCode} onChange={setE("packageCode")} maxLength={32} />
        </FG>
      </div>

      <FG label={t("adm.catalog.fieldMarking")} hint={t("adm.catalog.markingHint")}>
        <Select block variant="field" ariaLabel={t("adm.catalog.fieldMarking")}
                value={form.markingGroup} onChange={set("markingGroup")}
                options={[
                  { value: "", label: t("adm.catalog.noMarking"), icon: "fa-minus" },
                  ...options(MARKING_GROUP).map((o) => ({ ...o, icon: MARKING_GROUP[o.value]?.icon })),
                ]} />
      </FG>

      {/* ⚠ O'CHIRISH O'RNIGA SHU BAYROQ. Yozuvni do'konlar allaqachon
          olgan bo'lishi mumkin — o'chirish ularning tovarini egasiz
          qoldirardi. O'chirilgan yozuv faqat YANGI importda ko'rinmaydi. */}
      <label className="set-row" style={{ cursor: "pointer" }}>
        <div className="set-row__text">
          <div className="set-row__label">{t("adm.catalog.fieldActive")}</div>
          <div className="set-row__hint">{t("adm.catalog.activeHint")}</div>
        </div>
        <div className="set-row__control">
          <input type="checkbox" checked={form.active}
                 onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
        </div>
      </label>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   KATEGORIYALAR

   ⚠ Kategoriya do'kon TURIGA bog'lanishi mumkin: «Non mahsulotlari»
   oziq-ovqat do'koniga kerak, avtoehtiyot qismlar do'koniga yo'q.
   Tur ko'rsatilmasa — kategoriya hammaga ko'rinadi.
   ══════════════════════════════════════════════════════════════════════════ */
function CategoriesTab({ toast, cats, onChanged }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [form, setForm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const remove = async (c) => {
    /* ⚠ «O'chirish» so'zi ATAYLAB ehtiyotkor: ichida tovar bo'lsa
       server yozuvni o'chirmaydi, faqat yashiradi. Foydalanuvchiga
       shuni oldindan aytamiz, keyin emas. */
    const ok = await confirm({
      title: t("adm.catalog.delCatTitle"),
      message: (c.productCount || 0) > 0
        ? t("adm.catalog.delCatUsed", { name: c.name, n: c.productCount })
        : t("adm.catalog.delCatMsg",  { name: c.name }),
      type: "warning",
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    setBusyId(c.id);
    try {
      await catalogApi.delCategory(c.id);
      toast.success(t("adm.catalog.catDeleted"));
      onChanged();
    } catch (e) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="card">
      <div className="c-head">
        <h3 className="c-title">{t("adm.catalog.tabCategories")}</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({})}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> {t("adm.catalog.addCategory")}
        </button>
      </div>

      <p className="set-card__hint">{t("adm.catalog.catSubtitle")}</p>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>{t("adm.catalog.colName")}</th>
              <th>{t("adm.catalog.fieldType")}</th>
              <th>{t("adm.catalog.colParent")}</th>
              <th>{t("adm.catalog.colProducts")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cats.length > 0 ? cats.map((c) => (
              <tr key={c.id} style={{ opacity: c.active === false ? 0.5 : 1 }}>
                <td style={{ fontWeight: 700 }}>
                  {c.name}
                  {c.active === false && (
                    <span style={{ fontSize: 11, color: "var(--fg-secondary)", marginInlineStart: 8 }}>
                      {t("adm.catalog.hidden")}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>
                  {c.businessType ? businessType(c.businessType).label : t("adm.catalog.anyType")}
                </td>
                <td style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{c.parentName || "—"}</td>
                <td className="ek-num">{c.productCount ?? 0}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setForm(c)}>
                      <i className="fa-solid fa-pen" aria-hidden="true" /> {t("common.edit")}
                    </button>
                    <button className="btn btn-sm btn-outline" disabled={busyId === c.id}
                            onClick={() => remove(c)}>
                      <i className="fa-solid fa-trash" aria-hidden="true" /> {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5}>
                <Empty icon="fa-layer-group" title={t("adm.catalog.noCats")}
                       subtitle={t("adm.catalog.noCatsHint")} />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <CategoryModal row={form.id ? form : null} cats={cats} toast={toast}
                       onClose={() => setForm(null)}
                       onSaved={() => { setForm(null); onChanged(); }} />
      )}
    </div>
  );
}

function CategoryModal({ row, cats, toast, onClose, onSaved }) {
  const { t } = useT();
  const [form, setForm] = useState({
    name: row?.name || "",
    businessType: row?.businessType || "",
    parentId: row?.parentId ? String(row.parentId) : "",
    sortOrder: row?.sortOrder ?? 0,
    active: row ? row.active !== false : true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { toast.error(t("adm.catalog.required")); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        businessType: nz(form.businessType),
        parentId: form.parentId ? Number(form.parentId) : null,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      if (row) await catalogApi.editCategory(row.id, payload);
      else     await catalogApi.addCategory(payload);
      toast.success(t(row ? "adm.catalog.saved" : "adm.catalog.created"));
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}
           title={t(row ? "adm.catalog.editCatTitle" : "adm.catalog.addCategory", { name: row?.name })}
           footer={
             <>
               <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
               <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                 {saving ? <><Spinner /> {t("common.saving")}</>
                         : <><i className="fa-solid fa-check" aria-hidden="true" /> {t("common.save")}</>}
               </button>
             </>
           }>
      <FG label={`${t("adm.catalog.colName")} *`}>
        <input className="fi" value={form.name} autoFocus maxLength={120}
               onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </FG>

      <FG label={t("adm.catalog.fieldType")} hint={t("adm.catalog.catTypeHint")}>
        <Select block variant="field" ariaLabel={t("adm.catalog.fieldType")}
                value={form.businessType}
                onChange={(v) => setForm((f) => ({ ...f, businessType: v }))}
                options={[
                  { value: "", label: t("adm.catalog.anyType"), icon: "fa-globe" },
                  ...options(BUSINESS_TYPE).map((o) => ({ ...o, icon: BUSINESS_TYPE[o.value]?.icon })),
                ]} />
      </FG>

      <div className="g2">
        <FG label={t("adm.catalog.colParent")}>
          <Select block variant="field" searchable ariaLabel={t("adm.catalog.colParent")}
                  value={form.parentId}
                  onChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
                  options={[
                    { value: "", label: t("adm.catalog.noParent"), icon: "fa-minus" },
                    /* ⚠ O'ZINI o'ziga ota qilib bo'lmaydi — daraxt
                       halqaga aylanardi va ro'yxat cheksiz ochilardi. */
                    ...cats.filter((c) => !row || c.id !== row.id)
                           .map((c) => ({ value: String(c.id), label: c.name, icon: "fa-tag" })),
                  ]} />
        </FG>
        <FG label={t("adm.catalog.fieldSort")} hint={t("adm.catalog.sortHint")}>
          <input className="fi ek-num" type="number" value={form.sortOrder}
                 onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
        </FG>
      </div>

      <label className="set-row" style={{ cursor: "pointer" }}>
        <div className="set-row__text">
          <div className="set-row__label">{t("adm.catalog.fieldActive")}</div>
          <div className="set-row__hint">{t("adm.catalog.catActiveHint")}</div>
        </div>
        <div className="set-row__control">
          <input type="checkbox" checked={form.active}
                 onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
        </div>
      </label>
    </Modal>
  );
}
