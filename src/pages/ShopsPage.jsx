import { useCallback, useEffect, useMemo, useState } from "react";
import { shopApi, userApi, featureApi } from "../api";
import { fmtDate, fmtDateTime, SHOP_STATUS, STATUS_OPTIONS, ROLE_OPTIONS, SHOP_PLAN,
         shopStatus, shopPlan, roleLabel, money, paymentProvider } from "../utils";
import { useT } from "../lib/ek-i18n";
import Modal from "../components/Modal";
import { Empty, Search, FG, Badge, Avatar } from "../components/ui";
import { useConfirm } from "../context/ConfirmProvider";
import Select from "../components/ek/Select";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { SkeletonList } from "../components/ek/Loading";
import ExportButtons from "../components/ExportButtons";
import ShopFeaturesModal from "../components/ShopFeaturesModal";
import DirectionPicker from "../components/DirectionPicker";
import { isoDate } from "../utils/export";
import { CodeField, PhoneField, NameField, UsernameField, NumField } from "../components/ek/EkFields";
import { phoneInput } from "../lib/ek-input";
import { rankItems } from "../lib/ek-search";
import DataFilter, { useDataFilter, SortTh } from "../components/ek/DataFilter";


/* ── Obuna muddati ────────────────────────────────────────────────────────
   Sana emas, QOLGAN KUN ko'rsatiladi: "12-avgust" hech narsa demaydi,
   "3 kun qoldi" esa darhol harakatga chorlaydi. */

function daysLeft(shop) {
  if (!shop?.planExpiresAt) return null;
  return Math.ceil((new Date(shop.planExpiresAt) - Date.now()) / 86400000);
}

function expiryText(shop, t) {
  const d = daysLeft(shop);
  if (d === null) return t("bill.noExpiry");
  if (d === 0)    return t("bill.expiresToday");
  if (d < 0)      return t("bill.expiredAgo", { n: Math.abs(d) });
  return t("bill.expiresIn", { n: d });
}

/* Rang yolg'iz signal emas (CLAUDE.md #6) — yonida matn ham turadi. */
function expiryTone(shop) {
  const d = daysLeft(shop);
  if (d === null) return "var(--fg-secondary)";
  if (d < 0)  return "var(--fg-danger)";
  if (d <= 7) return "var(--fg-warning)";
  return "var(--fg-secondary)";
}

export default function ShopsPage({ toast }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [shops,   setShops]   = useState([]);
  const [loading, setLoading] = useState(true);
  // Ekranda ko'rsatiladigan holat: tez javobda skeleton UMUMAN chizilmaydi
  // (180ms kechikish), chizilgan bo'lsa esa kamida 400ms turadi — miltillamaydi.
  const busy = useLoading(loading);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("ALL");
  const [modal,   setModal]   = useState(null);

  // Faollik kesimi ALOHIDA so'rov bilan keladi va u yiqilsa ro'yxat
  // baribir chiziladi — do'kon nomi/holati statistikadan mustaqil.
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setShops((await shopApi.getAll()).data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }

    try {
      const rows = (await shopApi.stats()).data?.shops || [];
      setStats(Object.fromEntries(rows.map(r => [r.shopId, r])));
    } catch (_) { /* statistika ixtiyoriy — ro'yxatni to'sib qo'ymaydi */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ⚠ Avval HOLAT, keyin qidiruv: qidiruv natijani mosligiga qarab
     saralaydi va undan keyin filtrlash saralashni buzardi. */
  const byStatus = shops.filter((s) => filter === "ALL" || s.status === filter);
  /* ⚠ QIDIRUV — kassadagi bilan BIR XIL algoritm (`lib/ek-search.js`).
     Oddiy `includes` kirillcha yozuvni ham, apostrofni ham, xato
     yozilgan harfni ham topa olmasdi. */
  /* ══ USTUNLAR BO'YICHA FILTR (V68) ═══════════════════════════════════
     Ekrandagi o'n bir ustunning hammasi. Bu ro'yxat platformadagi
     BARCHA do'konlar — «qaysi tarifdagi qaysi do'konlar bir oydan
     beri sotmayapti?» degan savolni ko'z bilan yechib bo'lmasdi.

     ⚠ «Oxirgi sotuv» — `shops` da EMAS, `stats` da: u alohida
     so'rovdan keladi va `get` shu yerdan o'qiydi. */
  const COLS = useMemo(() => [
    { key: "name",  label: t("adm.shops.colShop"),       type: "text", get: (s) => s.name },
    { key: "code",  label: t("adm.shops.colCode"),       type: "text", get: (s) => s.code },
    { key: "type",  label: t("adm.shops.colType"),       type: "enum",
      options: [{ value: "main",   label: t("adm.shops.typeMain") },
                { value: "branch", label: t("adm.shops.typeBranch") }],
      get: (s) => (s.parentShopId ? "branch" : "main") },
    { key: "owner", label: t("adm.shops.colOwner"),      type: "text", get: (s) => s.ownerName },
    { key: "phone", label: t("common.phone"),            type: "text", get: (s) => s.phone },
    { key: "addr",  label: t("common.address"),          type: "text", get: (s) => s.address },
    { key: "st",    label: t("common.status"),           type: "enum",
      options: Object.keys(SHOP_STATUS).map((k) => ({ value: k, label: shopStatus(k).label })),
      get: (s) => s.status },
    { key: "plan",  label: t("adm.shops.colPlan"),       type: "enum",
      options: Object.keys(SHOP_PLAN).map((k) => ({ value: k, label: k })),
      get: (s) => s.plan },
    { key: "last",  label: t("adm.shops.colLastSale"),   type: "date",
      get: (s) => stats[s.id]?.lastSaleAt },
    { key: "dirs",  label: t("adm.shops.colDirections"), type: "text",
      get: (s) => (s.directions || []).map((d) => t(`adm.dir.${d}`)).join(", ") },
    { key: "made",  label: t("common.createdAt"),        type: "date", get: (s) => s.createdAt },
  ], [t, stats]);
  const colFlt = useDataFilter(COLS, "adm-shops");

  const filtered = rankItems(colFlt.apply(byStatus), search, {
    codes:  (s) => [s.code],
    digits: (s) => [s.phone],
    texts:  (s) => [s.name, s.code],
  });

  // Do'konni faqat ACTIVE ↔ BLOCKED almashtirish (DELETED ga o'tkazilmaydi UI dan)
  const handleToggleStatus = async (shop) => {
    const isActive = shop.status === "ACTIVE";
    const newStatus = isActive ? "BLOCKED" : "ACTIVE";
    const ok = await confirm({
      title: t(isActive ? "adm.shops.blockTitle" : "adm.shops.unblockTitle"),
      // Do'kon NOMI tarjima qilinmaydi — u foydalanuvchi ma'lumoti
      message: t(isActive ? "adm.shops.blockMsg" : "adm.shops.unblockMsg", { name: shop.name }),
      type: isActive ? "warning" : "info",
      confirmText: t(isActive ? "adm.shops.block" : "adm.shops.activate"),
    });
    if (!ok) return;
    try {
      await shopApi.update(shop.id, { status: newStatus });
      toast.success(t(isActive ? "adm.shops.blocked" : "adm.shops.activated"));
      load();
    } catch (e) { toast.error(e.message); }
  };

  // O'chirish faqat ACTIVE/BLOCKED do'konlarda
  const handleDelete = async (shop) => {
    const ok = await confirm({
      title: t("adm.shops.deleteTitle"),
      message: t("adm.shops.deleteMsg", { name: shop.name }),
      type: "danger",
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    try { await shopApi.delete(shop.id); toast.success(t("adm.shops.deleted")); load(); }
    catch (e) { toast.error(e.message); }
  };

  /* Eksport EKRANDAGI ro'yxatni oladi (`filtered`): tab va qidiruvdan keyin
     nima ko'rinayotgan bo'lsa, faylga ham o'sha tushadi. Summa va sana
     xom holida yoziladi — Excel'da yig'ish va saralash uchun. */
  /* ⚠ TUSHUM USTUNI EKSPORTDAN HAM CHIQARILDI (V50): u endi serverdan
     kelmaydi va faylga har qatorda «0» yozardi. O'rniga do'konning
     YO'NALISHI qo'shildi — u endi do'kon kartochkasining bir qismi va
     ro'yxatni ko'rib chiqishda «bu do'kon sozlanganmi?» degan savolga
     javob beradi. */
  const exportHeaders = [
    t("adm.shops.colShop"), t("adm.shops.colCode"), t("adm.shops.colType"),
    t("adm.shops.colOwner"), t("common.phone"), t("common.address"),
    t("common.status"), t("adm.shops.colPlan"),
    t("adm.shops.colLastSale"), t("adm.shops.colDirections"), t("common.createdAt"),
  ];
  const exportRows = filtered.map((s) => [
    s.name, s.code, s.parentShopName || "", s.ownerName || "",
    s.phone || "", s.address || "",
    shopStatus(s.status).label, s.plan || "",
    isoDate(stats[s.id]?.lastSaleAt),
    (s.directions || []).map((d) => t(`adm.dir.${d}`)).join(", "),
    isoDate(s.createdAt),
  ]);

  const counts = {
    ALL:       shops.length,
    ACTIVE:    shops.filter(s => s.status === "ACTIVE").length,
    BLOCKED:   shops.filter(s => s.status === "BLOCKED").length,
    SUSPENDED: shops.filter(s => s.status === "SUSPENDED").length,
    DELETED:   shops.filter(s => s.status === "DELETED").length,
  };

  return (
    <div>
      {/* DELETED tavsiya banneri */}
      {counts.DELETED > 0 && (
        <div className="ek-note ek-note--warning">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <span>{t("adm.shops.deletedBanner", { n: counts.DELETED })}</span>
        </div>
      )}

      <div className="card">
        <div className="c-head">
          <div className="tabs" style={{ flexWrap:"wrap" }}>
            {[
              { k:"ALL",       l: t("adm.shops.tabAll",       { n: counts.ALL })       },
              { k:"ACTIVE",    l: t("adm.shops.tabActive",    { n: counts.ACTIVE })    },
              { k:"BLOCKED",   l: t("adm.shops.tabBlocked",   { n: counts.BLOCKED })   },
              { k:"SUSPENDED", l: t("adm.shops.tabSuspended", { n: counts.SUSPENDED }) },
              ...(counts.DELETED > 0 ? [{ k:"DELETED", l: t("adm.shops.tabDeleted", { n: counts.DELETED }) }] : []),
            ].map(({ k, l }) => (
              <button key={k} className={`tab ${filter===k?"on":""}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <Search value={search} onChange={setSearch} placeholder={t("adm.shops.searchPlaceholder")} style={{ width:220 }} />
            <ExportButtons name="dokonlar" headers={exportHeaders} rows={exportRows} toast={toast} />
            <button className="btn btn-primary btn-sm" onClick={() => setModal("add")}>
              <i className="fa-solid fa-plus" /> {t("adm.shops.new")}
            </button>
            <DataFilter cols={COLS} flt={colFlt} />
          </div>
        </div>

        <div className="tw">
          {busy ? <SkeletonTable rows={7} cols={["wide", "text", "text", "text", "text"]} /> : (
            <table>
              <thead>
                <tr>
                  <SortTh flt={colFlt} col="name">{t("adm.shops.colShop")}</SortTh>
                  <SortTh flt={colFlt} col="code">{t("adm.shops.colCode")}</SortTh>
                  <SortTh flt={colFlt} col="type">{t("adm.shops.colType")}</SortTh>
                  <SortTh flt={colFlt} col="owner">{t("adm.shops.colOwner")}</SortTh>
                  <SortTh flt={colFlt} col="phone">{t("common.phone")}</SortTh>
                  <SortTh flt={colFlt} col="addr">{t("common.address")}</SortTh>
                  <SortTh flt={colFlt} col="st">{t("common.status")}</SortTh>
                  <SortTh flt={colFlt} col="plan">{t("adm.shops.colPlan")}</SortTh>
                  {/* Tartib TANA bilan bir xil bo'lishi shart: yangi ustunlar
                      holatdan keyin qo'shildi, "Yaratilgan" esa ulardan keyin. */}
                  <SortTh flt={colFlt} col="last">{t("adm.shops.colLastSale")}</SortTh>
                  {/* Yo'nalish (V49) — «bu do'kon sozlanganmi?» degan
                      savolga ro'yxatning o'zidan javob. Tushum ustuni
                      shu yerda edi; sabab pastdagi izohda. */}
                  <SortTh flt={colFlt} col="dirs">{t("adm.shops.colDirections")}</SortTh>
                  <SortTh flt={colFlt} col="made">{t("common.createdAt")}</SortTh>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((shop) => {
                  const st = { ...shopStatus(shop.status), color: SHOP_STATUS[shop.status]?.color || "gray" };
                  const isDeleted = shop.status === "DELETED";
                  return (
                    <tr key={shop.id} style={{ opacity: isDeleted ? 0.5 : 1 }}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:"var(--bg-brand-subtle)", color:"var(--bg-brand)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900 }}>
                            {shop.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700 }}>{shop.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-blue ek-num">{shop.code}</span></td>
                      <td>
                        {shop.parentShopId ? (
                          <div style={{ display:"flex", flexDirection:"column" }}>
                            <span className="badge badge-orange" style={{ fontSize:9 }}>{t("adm.shops.typeBranch")}</span>
                            <span style={{ fontSize:10, color:"var(--fg-tertiary)", marginTop:2 }}>{shop.parentShopName}</span>
                          </div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                            <span className="badge badge-green" style={{ fontSize:9 }}>{t("adm.shops.typeMain")}</span>
                            {/* V31: o'zi ro'yxatdan o'tgan + so'ragan tarifi.
                                Pullik so'ragan bo'lsa — bog'lanish kerak. */}
                            {shop.selfRegistered && (
                              <span className="badge badge-blue" style={{ fontSize:9 }}
                                    title={t("adm.shops.selfRegisteredHint")}>
                                {t("adm.shops.selfRegistered")}
                              </span>
                            )}
                            {shop.planRequested && (
                              <span className="badge badge-orange" style={{ fontSize:9 }}
                                    title={t("adm.shops.planRequestedHint")}>
                                {t("adm.shops.planRequested")}: {shop.planRequested}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight:700 }}>
                        {shop.ownerName || <span style={{ color:"var(--fg-tertiary)", fontWeight:400 }}>—</span>}
                      </td>
                      <td className="ek-num" style={{ fontSize:12, color:"var(--fg-secondary)" }}>{shop.phone||"—"}</td>
                      <td style={{ fontSize:12, color:"var(--fg-tertiary)", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{shop.address||"—"}</td>
                      <td><Badge color={st.color}>{st.label}</Badge></td>
                      {/* Tarif + muddat. Filialda obuna yo'q — u bosh
                          do'konning obunasi ichida yashaydi. */}
                      <td style={{ fontSize:12 }}>
                        {shop.parentShopId ? (
                          <span style={{ color:"var(--fg-secondary)" }}>—</span>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                            <Badge color={shop.plan ? SHOP_PLAN[shop.plan]?.color : "gray"}>
                              {shop.plan ? shopPlan(shop.plan).label : t("adm.shops.noPlan")}
                            </Badge>
                            <span className="ek-num" style={{ fontSize:10, color: expiryTone(shop) }}>
                              {expiryText(shop, t)}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* "Oxirgi sotuv" — panelning eng foydali ustuni:
                          do'kon tashlab ketilganini bitta qarashda ko'rsatadi.
                          Ro'yxatdan o'tgan do'kon soni buni aytmaydi. */}
                      <td className="ek-num" style={{ fontSize:12, whiteSpace:"nowrap",
                            color: stats[shop.id]?.lastSaleAt ? "var(--fg-primary)" : "var(--fg-secondary)" }}>
                        {stats[shop.id]?.lastSaleAt
                          ? fmtDate(stats[shop.id].lastSaleAt)
                          : <span style={{ fontStyle:"italic" }}>{t("adm.shops.neverSold")}</span>}
                      </td>
                      {/* Yo'nalishlar. Bo'sh — hali tanlanmagan va bunday
                          do'konda HAMMA modul ochiq (ko'chirish qoidasi),
                          shuning uchun bu holat «—» emas, alohida matn
                          bilan ko'rsatiladi. */}
                      <td style={{ fontSize:11, maxWidth:150 }}>
                        {shop.directions?.length ? (
                          <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                            {shop.directions.map((d) => (
                              <Badge key={d} color="blue">{t(`adm.dir.${d}`)}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color:"var(--fg-warning)", fontStyle:"italic" }}>
                            {t("adm.shops.noDirections")}
                          </span>
                        )}
                      </td>
                      {/* ⚠ «30 kunlik tushum» USTUNI OLIB TASHLANDI (V50).
                          Do'konning aylanmasi — uning tijorat siri, u
                          kassa dasturidan foydalanadi, xolos. Server
                          endi bu raqamni umuman qaytarmaydi
                          (`ShopPrivacyPolicy`), shuning uchun ustunni
                          qoldirish har qatorda «0 so'm» chizardi.
                          «Oxirgi sotuv» qoldi: u pul emas va aynan
                          «bu do'kon tashlab ketilganmi?» degan savolga
                          javob beradi. */}
                      <td style={{ fontSize:12, color:"var(--fg-tertiary)" }}>{fmtDate(shop.createdAt)}</td>
                      <td>
                        {isDeleted ? (
                          /* O'chirilgan do'konlarda hech qanday amal yo'q */
                          <span style={{ fontSize:11, color:"var(--fg-secondary)", fontStyle:"italic" }}>{t("adm.shops.archived")}</span>
                        ) : (
                          <div style={{ display:"flex", gap:5 }}>
                            <button className="bic b-blue" title={t("adm.shops.staff")}
                              onClick={() => setModal({ type:"users", shop })}>
                              <i className="fa-solid fa-users" />
                            </button>
                            {/* Filialda obuna yo'q — to'lov bosh do'konga qayd etiladi */}
                            {!shop.parentShopId && (
                              <button className="bic b-green" title={t("bill.action")}
                                onClick={() => setModal({ type:"billing", shop })}>
                                <i className="fa-solid fa-credit-card" />
                              </button>
                            )}
                            {/* Modullar (V49) — do'konning INTERFEYSI.
                                ⚠ Filialda ham alohida turadi: yo'nalish
                                bosh do'kondan meros bo'lsa-da, istisno
                                filialga alohida qo'yilishi mumkin
                                (masalan faqat markaziy ombordan berish). */}
                            <button className="bic b-blue" title={t("adm.features.action")}
                              onClick={() => setModal({ type:"features", shop })}>
                              <i className="fa-solid fa-toggle-on" />
                            </button>
                            <button className="bic b-blue" title={t("common.edit")}
                              onClick={() => setModal({ type:"edit", shop })}>
                              <i className="fa-solid fa-pen" />
                            </button>
                            {(shop.status === "ACTIVE" || shop.status === "BLOCKED") && (
                              <button
                                className={`bic ${shop.status==="ACTIVE" ? "b-yellow" : "b-green"}`}
                                title={t(shop.status==="ACTIVE" ? "adm.shops.block" : "adm.shops.activate")}
                                onClick={() => handleToggleStatus(shop)}>
                                <i className={`fa-solid ${shop.status==="ACTIVE" ? "fa-ban" : "fa-check"}`} />
                              </button>
                            )}
                            <button className="bic b-red" title={t("common.delete")}
                              onClick={() => handleDelete(shop)}>
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={12}><Empty icon="fa-store" title={t("adm.shops.notFound")} /></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal === "add" && (
        <AddShopModal onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} toast={toast} />
      )}
      {modal?.type === "edit" && (
        <EditShopModal shop={modal.shop} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} toast={toast} />
      )}
      {modal?.type === "billing" && (
        <BillingModal shop={modal.shop} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }} toast={toast} />
      )}
      {modal?.type === "users" && (
        <ShopUsersModal shop={modal.shop} onClose={() => setModal(null)} onReload={load} toast={toast} />
      )}
      {modal?.type === "features" && (
        <ShopFeaturesModal shop={modal.shop} onClose={() => setModal(null)}
          onSaved={load} toast={toast} />
      )}
    </div>
  );
}

// ── Yangi do'kon ──────────────────────────────────────────────
function AddShopModal({ onClose, onSaved, toast }) {
  const { t } = useT();
  const [shops, setShops] = useState([]);
  // Xizmat yo'nalishlari (V49) — do'konning interfeysi shundan chiqadi.
  const [dirCatalog, setDirCatalog] = useState([]);
  const [dirs, setDirs] = useState(new Set());
  /* ⚠ Telefon BO'SH boshlanadi. Ilgari u «+998 » edi va maydonga
     tegilmasa o'sha ko'rinishda serverga ketardi: `@Pattern` esa uni
     raqam deb hisoblamay, do'kon yaratishni 400 xatosi bilan to'xtatardi
     («telefon noto'g'ri») — holbuki telefon MAJBURIY EMAS.
     Kod endi maydon YONIDA turadi (`PhoneField`), qiymat ichida emas. */
  const [form, setForm] = useState({ name:"", code:"", phone:"", address:"", parentShopId: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    shopApi.getAll().then(res => setShops(res.data || [])).catch(() => {});
    /* ⚠ Yo'nalishlar ro'yxati YIQILSA forma baribir ochiladi: yo'nalish
       majburiy emas va usiz yaratilgan do'konda hamma modul ochiq
       qoladi. Ya'ni bu so'rovning yiqilishi do'kon ochishga to'sqinlik
       qilmasligi kerak. */
    featureApi.directions().then(res => setDirCatalog(res.data || [])).catch(() => {});
  }, []);

  const toggleDir = (key) => setDirs((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error(t("adm.shops.nameCodeRequired")); return; }
    setSaving(true);
    try { 
      const payload = { 
        ...form, 
        /* `PhoneField` qiymatni tayyor holda beradi («+998901234567»
           yoki bo'sh) — bu yerda qayta tozalash kerak emas. Bo'sh
           maydon `null` bo'lib ketadi: ixtiyoriy maydon shunday. */
        phone: form.phone || null,
        parentShopId: form.parentShopId || null,
        /* ⚠ Bo'sh ro'yxat ham yuboriladi va bu «hali tanlanmagan»
           degani: server bunday do'konda hamma modulni ochiq
           qoldiradi. Majburiy qilinmadi — o'z-o'zidan ro'yxatdan
           o'tgan do'konda ham yo'nalish bo'lmaydi. */
        directions: [...dirs],
      };
      await shopApi.create(payload); 
      toast.success(t("adm.shops.created")); 
      onSaved(); 
    }
    catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t("adm.shops.createTitle")} onClose={onClose} footer={
      <><button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><Spinner /> {t("common.creating")}</> : <><i className="fa-solid fa-plus" /> {t("common.create")}</>}
        </button></>
    }>
      <FG label={`${t("adm.shops.fieldName")} *`}>
        <input className="fi" maxLength={120} value={form.name} onChange={set("name")} placeholder="Baraka Savdo" autoFocus />
      </FG>
      <FG label={`${t("adm.shops.fieldCode")} *`} hint={t("adm.shops.codeHint")}>
        <CodeField className="fi ek-num" value={form.code} onChange={set("code")} placeholder="baraka-shop" />
      </FG>
      <div className="g2">
        <FG label={t("common.phone")}>
          <PhoneField className="fi ek-num" value={form.phone} onChange={set("phone")} />
        </FG>
        <FG label={t("common.address")}>
          <input className="fi" maxLength={200} value={form.address} onChange={set("address")} placeholder="Toshkent, Chilonzor" />
        </FG>
      </div>
      <FG label={t("adm.shops.fieldParent")} hint={t("adm.shops.parentHint")}>
        <Select
          block variant="field" ariaLabel={t("adm.shops.fieldParent")}
          value={form.parentShopId ? String(form.parentShopId) : ""}
          onChange={(v) => set("parentShopId")({ target: { value: v } })}
          options={[
            { value: "", label: t("adm.shops.parentNone"), icon: "fa-store" },
            ...shops.filter(s => !s.parentShopId && s.status === "ACTIVE")
                    .map(s => ({ value: String(s.id), label: `${s.name} (${s.code})`, icon: "fa-code-branch" })),
          ]}
        />
      </FG>

      {/* ── Xizmat yo'nalishlari (V49) ──────────────────────────────────
          ⚠ FILIALDA SO'RALMAYDI: filial yo'nalishni bosh do'kondan
          MEROS oladi va server bu yerdan kelgan qiymatni e'tiborsiz
          qoldiradi. Dorixonaning filiali ham dorixona; boshqacha
          bo'lsa, bitta katalogga ulangan ikki xil interfeysli do'kon
          paydo bo'lardi. */}
      {!form.parentShopId && dirCatalog.length > 0 && (
        <FG label={t("adm.shops.fieldDirections")} hint={t("adm.shops.directionsHint")}>
          <DirectionPicker catalog={dirCatalog} selected={dirs} onToggle={toggleDir} />
          {/* ⚠ Tanlanmagan holat NOSOZLIK EMAS — buni aytib qo'yish
              kerak, aks holda forma «to'ldirilmagan» bo'lib ko'rinadi. */}
          {dirs.size === 0 && (
            <div style={{ fontSize:11, color:"var(--fg-secondary)", marginTop:6 }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> {t("adm.shops.noDirectionsHint")}
            </div>
          )}
        </FG>
      )}
    </Modal>
  );
}

// ── Do'konni tahrirlash ───────────────────────────────────────
// ShopStatus enum'idagi barcha qiymatlar (utils dan keladi)

function EditShopModal({ shop, onClose, onSaved, toast }) {
  const { t } = useT();
  /* ⚠ Bazadan kelgan raqam NIQOB SHAKLIGA keltiriladi. Eski yozuvlarda
     u «+998 90 123-45-67» bo'lishi mumkin; tegilmagan holda o'sha
     ko'rinishda qaytib ketsa, endi server uni rad etardi. */
  const [form, setForm] = useState({
    name: shop.name || "",
    phone: phoneInput(shop.phone || "").raw,
    address: shop.address || "",
    status: shop.status || "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try { 
      const payload = { ...form, phone: form.phone || null };
      await shopApi.update(shop.id, payload); 
      toast.success(t("common.saved")); 
      onSaved(); 
    }
    catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t("adm.shops.editTitle", { name: shop.name })} onClose={onClose} footer={
      <><button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><Spinner /> {t("common.saving")}</> : <><i className="fa-solid fa-check" /> {t("common.save")}</>}
        </button></>
    }>
      <FG label={t("adm.shops.fieldName")}>
        <input className="fi" maxLength={120} value={form.name} onChange={set("name")} />
      </FG>
      <FG label={t("adm.shops.fieldOwner")} hint={t("adm.shops.ownerHint")}>
        {/* Qattiq `#f1f5f9` qorong'i rejimda oq plastinka bo'lib chiqardi */}
        <input className="fi" value={shop.ownerName || t("adm.shops.ownerEmpty")} readOnly
          style={{ background:"var(--bg-sunken)", color:"var(--fg-secondary)", cursor:"not-allowed" }} />
      </FG>
      <div className="g2">
        <FG label={t("common.phone")}>
        <PhoneField className="fi ek-num" value={form.phone} onChange={set("phone")} />
      </FG>
        <FG label={t("common.address")}>
          <input className="fi" maxLength={200} value={form.address} onChange={set("address")} />
        </FG>
      </div>
      <FG label={t("common.status")}>
        <Select
          block variant="field" ariaLabel={t("adm.shops.statusLabel")}
          value={form.status}
          onChange={(v) => set("status")({ target: { value: v } })}
          options={STATUS_OPTIONS.map(k => ({ value: k, label: shopStatus(k).label, icon: SHOP_STATUS[k]?.icon }))}
        />
      </FG>
    </Modal>
  );
}

// ── Do'kon xodimlari modal ────────────────────────────────────
function ShopUsersModal({ shop, onClose, onReload, toast }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState("list"); // "list"|"add"|{type:"edit",user}
  const [form,     setForm]     = useState({ fullName:"", username:"", password:"", role:"CASHIER" });
  const [saving,   setSaving]   = useState(false);

  const hasOwner = users.some(u => (u.roles||[]).some(r => (r.name||r.type||r) === "OWNER"));
  const availableRoles = !hasOwner ? ["OWNER"] : ROLE_OPTIONS.filter(r => r !== "OWNER");

  const load = async () => {
    setLoading(true);
    try { setUsers((await userApi.getByShop(shop.id)).data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => {
    setForm({ fullName:"", username:"", password:"", role: availableRoles[0] || "CASHIER" });
    setView("add");
  };

  const handleAdd = async () => {
    if (!form.fullName.trim()) { toast.error(t("adm.users.errName")); return; }
    if (!form.username.trim()) { toast.error(t("adm.users.errUsername")); return; }
    if (!form.password)        { toast.error(t("adm.users.errPassword")); return; }
    setSaving(true);
    try {
      /* ⚠ PAROL CHETIDAN QIRQILADI. Parol odatda boshqa joydan NUSXA
         olinadi va nusxaga bir bo'sh joy qo'shilib ketishi juda oson.
         U saqlanib qolsa, xodim parolini to'g'ri yozib turib ham kira
         olmasdi va sababi hech qayerda ko'rinmasdi. */
      const saved = await userApi.create(shop.id, { ...form, password: form.password.trim() });
      /* Saqlangan LOGIN aytiladi: uni xodimga aynan shu ko'rinishda
         berish kerak va u yozilganidan farq qilishi mumkin. */
      toast.success(`${t("adm.users.added")}: ${saved?.data?.username || form.username}`);
      setView("list"); load(); onReload();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!form.fullName.trim()) { toast.error(t("adm.users.errName")); return; }
    setSaving(true);
    try {
      // Ism va parol BITTA so'rovda. Ilgari ikkita alohida so'rov edi va
      // ikkinchisi yiqilsa ism saqlanib, parol saqlanmay qolardi.
      // `role` YUBORILMAYDI — u bu formada tahrirlanmaydi va backend endi
      // yuborilmagan rolni "tegilmasin" deb tushunadi.
      await userApi.update(shop.id, view.user.id, {
        fullName: form.fullName,
        ...(form.password ? { password: form.password.trim() } : {}),
      });
      toast.success(t("common.saved"));
      setView("list"); load(); onReload();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    const isBlocking = u.enabled;
    const ok = await confirm({
      title: t(isBlocking ? "adm.users.blockTitle" : "adm.users.unblockTitle"),
      // Xodim ISMI tarjima qilinmaydi — u foydalanuvchi ma'lumoti
      message: t(isBlocking ? "adm.users.blockMsg" : "adm.users.unblockMsg", { name: u.fullName }),
      type: isBlocking ? "warning" : "info",
      confirmText: t(isBlocking ? "adm.shops.block" : "adm.shops.activate"),
    });
    if (!ok) return;
    try {
      await userApi.toggleBlock(shop.id, u.id);
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, enabled:!u.enabled} : x));
      toast.success(t(u.enabled ? "adm.users.blockedToast" : "adm.users.activatedToast"));
      onReload();
    } catch (e) { toast.error(e.message); }
  };

  const openEdit = (u) => {
    setForm({ fullName: u.fullName, username: u.username, password:"" });
    setView({ type:"edit", user: u });
  };

  /* ⚠ «NEGA KIRA OLMAYAPTI». Kirish ekranidagi xabar ataylab bir xil
     («Login yoki parol noto'g'ri») va shunday qoladi — aks holda begona
     odam qaysi loginlar borligini bittalab tekshirib chiqardi. Lekin
     do'kon egasi uchun bu boshi berk ko'cha edi: xodim kira olmaydi,
     sabab esa hech qayerda ko'rinmaydi. Endi javobni server aytadi. */
  const [checking, setChecking] = useState(null);   // { username, data }
  const runCheck = async (u) => {
    setChecking({ username: u.username, data: null });
    try {
      const r = await userApi.loginCheck(shop.code, u.username);
      setChecking({ username: u.username, data: r?.data || null });
    } catch (e) {
      toast.error(e.message);
      setChecking(null);
    }
  };

  const isAdd  = view === "add";
  const isEdit = view?.type === "edit";
  const isList = view === "list";

  return (
    <Modal title={t("adm.users.title", { name: shop.name })} onClose={onClose} size="md" footer={
      isList ? (
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="fa-solid fa-user-plus" />
          {" "}{t(hasOwner ? "adm.users.addStaff" : "adm.users.addOwnerRequired")}
        </button>
      ) : (
        <><button className="btn btn-outline btn-sm" onClick={() => setView("list")}>
            <i className="fa-solid fa-arrow-left" /> {t("common.back")}
          </button>
          <button className="btn btn-primary btn-sm" onClick={isAdd ? handleAdd : handleEdit} disabled={saving}>
            {saving ? <><Spinner /> {t("common.saving")}</> : <><i className="fa-solid fa-check" /> {t(isAdd ? "common.add" : "common.save")}</>}
          </button></>
      )
    }>
      {isAdd && (
        <div>
          {/* Ranglar tokenlardan: qattiq #fffbeb/#92400e qorong'i rejimda
              o'qib bo'lmas darajada och sariq bo'lib chiqardi. */}
          {!hasOwner && (
            <div className="ek-note ek-note--warning">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              {t("adm.users.ownerFirst")}
            </div>
          )}
          <FG label={`${t("common.fullName")} *`}>
            <NameField className="fi" value={form.fullName} onChange={set("fullName")} placeholder="Abdullayev Ali" autoFocus />
          </FG>
          <div className="g2">
            <FG label={`${t("common.username")} *`}>
              <UsernameField className="fi ek-num" value={form.username} onChange={set("username")} placeholder="ali_abdullayev" />
            </FG>
            <FG label={`${t("common.password")} *`}>
              <input className="fi" type="password" value={form.password} onChange={set("password")} placeholder={t("adm.users.passwordMin")} />
            </FG>
          </div>
          <FG label={`${t("common.role")} *`}>
            <Select
              block variant="field" ariaLabel={t("common.role")}
              value={form.role}
              onChange={(v) => set("role")({ target: { value: v } })}
              options={availableRoles.map(r => ({ value: r, label: roleLabel(r), icon: "fa-user-tag" }))}
            />
          </FG>
        </div>
      )}

      {isEdit && (
        <div>
          <FG label={t("common.fullName")}>
            <NameField className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
          </FG>
          <FG label={t("common.username")} hint={t("adm.users.usernameLocked")}>
            <input className="fi ek-num" value={form.username} readOnly
              style={{ background:"var(--bg-sunken)", color:"var(--fg-secondary)", cursor:"not-allowed" }} />
          </FG>
          <FG label={t("common.newPassword")} hint={t("adm.users.passwordHint")}>
            <input className="fi" type="password" value={form.password} onChange={set("password")} placeholder={t("adm.users.passwordOptional")} />
          </FG>
        </div>
      )}

      {/* ══ NEGA KIRA OLMAYAPTI — JAVOB ═══════════════════════════════
          Ro'yxatning USTIDA turadi: uni topish uchun pastga surish
          kerak bo'lsa, javob ko'rilmay qolardi. */}
      {isList && checking && (
        <div className="ek-note ek-note--info" style={{ marginBottom: 10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: checking.data ? 6 : 0 }}>
            <i className="fa-solid fa-stethoscope" aria-hidden="true" />
            <b>@{checking.username}</b>
            <button className="bic" style={{ marginLeft:"auto" }} title={t("common.close")}
                    aria-label={t("common.close")} onClick={() => setChecking(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          {!checking.data ? <span>{t("common.loading")}</span> : (
            <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:12 }}>
              <div style={{ fontWeight:800 }}>{checking.data.verdict}</div>
              {/* ⚠ Saqlangan login QAVS ichida: «egasi» va « egasi »
                  ekranda bir xil ko'rinadi va aynan shu farq odamni bir
                  necha kun ovora qilishi mumkin. */}
              {checking.data.storedUsername && (
                <div>{t("adm.users.storedLogin")}: <span className="ek-num">{checking.data.storedUsername}</span></div>
              )}
              <div>{t("adm.users.shopCode")}: <span className="ek-num">{checking.data.shopCode}</span>
                {" · "}{checking.data.shopStatus}</div>
              {checking.data.adminWithSameLogin && (
                <div style={{ color:"var(--fg-warning)" }}>{t("adm.users.adminSameLogin")}</div>
              )}
              {checking.data.sameLoginOtherShops?.length > 0 && (
                <div style={{ color:"var(--fg-warning)" }}>
                  {t("adm.users.loginElsewhere")}: <span className="ek-num">{checking.data.sameLoginOtherShops.join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isList && (
        loading ? <SkeletonList rows={4} /> : users.length === 0 ? (
          <Empty icon="fa-users" title={t("adm.users.none")} subtitle={t("adm.users.noneHint")} />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {users.map((u) => {
              const roles = u.roles || [];
              const isOwner = roles.some(r => (r.name||r.type||r) === "OWNER");
              return (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:11, border:"1.5px solid var(--border-default)", background:"var(--bg-surface)", opacity: u.enabled ? 1 : 0.55 }}>
                  <Avatar name={u.fullName} size={36} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                      {u.fullName}
                      {isOwner && <span className="badge" style={{ fontSize:10, background:"var(--ek-role-owner-bg)", color:"var(--ek-role-owner)" }}>{t("enum.role.OWNER.short")}</span>}
                    </div>
                    <div className="ek-num" style={{ fontSize:11, color:"var(--fg-secondary)" }}>@{u.username}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <Badge color={u.enabled?"green":"red"}>{t(u.enabled ? "common.active" : "common.blocked")}</Badge>
                    <button className="bic b-blue" title={t("common.edit")} onClick={() => openEdit(u)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button className="bic" title={t("adm.users.whyNoLogin")}
                            aria-label={t("adm.users.whyNoLogin")} onClick={() => runCheck(u)}>
                      <i className="fa-solid fa-stethoscope" />
                    </button>
                    <button
                      className={`btn btn-sm ${u.enabled ? "btn-danger" : "btn-activate"}`}
                      onClick={() => handleToggle(u)}>
                      <i className={`fa-solid ${u.enabled ? "fa-ban" : "fa-check"}`} />
                      {t(u.enabled ? "adm.shops.block" : "adm.shops.activate")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </Modal>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   To'lovni qayd etish va tarix.

   Hozircha to'lov QO'LDA kiritiladi (naqd, bank o'tkazmasi, shartnoma).
   Forma maydonlari ataylab Payme/Click callback'i bilan bir xil shaklda:
   `provider` va `providerTransactionId` allaqachon bor, ya'ni shlyuz
   ulanganda bu forma ham, backend so'rovi ham o'zgarmaydi.
   ══════════════════════════════════════════════════════════════════════════ */
function BillingModal({ shop, onClose, onSaved, toast }) {
  const { t } = useT();
  const [items,  setItems]  = useState([]);
  const [busy,   setBusy]   = useState(true);
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState({
    plan: shop.plan && shop.plan !== "FREE" ? shop.plan : "BASIC",
    amount: "", months: 1, provider: "MANUAL", providerTransactionId: "", note: "",
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    shopApi.payments(shop.id)
      .then(r => setItems(r.data || []))
      .catch(e => toast.error(e.message))
      .finally(() => setBusy(false));
  }, []);

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error(t("bill.amount")); return; }
    setSaving(true);
    try {
      await shopApi.addPayment(shop.id, {
        plan: form.plan,
        amount: Number(form.amount),
        months: Number(form.months) || 1,
        provider: form.provider,
        providerTransactionId: form.providerTransactionId || null,
        note: form.note || null,
      });
      toast.success(t("bill.registered"));
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t("bill.title", { name: shop.name })} onClose={onClose} size="md" footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><Spinner /> {t("common.saving")}</>
                  : <><i className="fa-solid fa-check" /> {t("bill.action")}</>}
        </button>
      </>
    }>
      <div className="g2">
        <FG label={t("bill.plan")}>
          <Select block variant="field" ariaLabel={t("bill.plan")}
            value={form.plan}
            onChange={(v) => set("plan")({ target: { value: v } })}
            options={["BASIC", "PREMIUM", "ENTERPRISE"].map(k => ({
              value: k, label: shopPlan(k).label, icon: SHOP_PLAN[k]?.icon }))} />
        </FG>
        <FG label={t("bill.months")}>
          <NumField className="fi ek-num" kind="int" min={1} max={36}
            value={form.months} onChange={set("months")} />
        </FG>
      </div>
      <FG label={`${t("bill.amount")} *`}>
        <NumField className="fi ek-num" kind="money"
          value={form.amount} onChange={set("amount")} placeholder="240000" autoFocus />
      </FG>
      <div className="g2">
        <FG label={t("bill.provider")}>
          <Select block variant="field" ariaLabel={t("bill.provider")}
            value={form.provider}
            onChange={(v) => set("provider")({ target: { value: v } })}
            options={["MANUAL", "PAYME", "CLICK"].map(k => ({
              value: k, label: paymentProvider(k).label, icon: paymentProvider(k).icon }))} />
        </FG>
        <FG label={t("bill.txnId")} hint={t("bill.txnHint")}>
          <input className="fi ek-num" maxLength={128} value={form.providerTransactionId}
            onChange={set("providerTransactionId")} />
        </FG>
      </div>
      <FG label={t("bill.note")}>
        <input className="fi" maxLength={500} value={form.note} onChange={set("note")} />
      </FG>

      <div className="c-head" style={{ padding:"14px 0 6px" }}>
        <span className="c-title" style={{ fontSize:13 }}>
          <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> {t("bill.history")}
        </span>
      </div>
      {busy ? <SkeletonList rows={3} avatar={false} /> : items.length === 0 ? (
        <Empty icon="fa-receipt" title={t("bill.none")} subtitle={t("bill.noneHint")} />
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>{t("bill.paidAt")}</th><th>{t("bill.plan")}</th>
                <th className="num">{t("bill.amount")}</th>
                <th>{t("bill.provider")}</th><th>{t("bill.coversUntil")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(pmt => (
                <tr key={pmt.id}>
                  <td className="ek-num" style={{ fontSize:11 }}>{fmtDateTime(pmt.paidAt)}</td>
                  <td>{shopPlan(pmt.plan).label}</td>
                  <td className="num ek-num" style={{ fontWeight:700 }}>{money(pmt.amount)}</td>
                  <td style={{ fontSize:12 }}>{paymentProvider(pmt.provider).label}</td>
                  <td className="ek-num" style={{ fontSize:11 }}>{fmtDate(pmt.coversUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
