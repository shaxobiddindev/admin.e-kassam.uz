import { useCallback, useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
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
import { isoDate } from "../utils/export";


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

  const filtered = shops.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name?.toLowerCase().includes(q) || s.code?.includes(q) || s.phone?.includes(q);
    const matchF = filter === "ALL" || s.status === filter;
    return matchQ && matchF;
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
  const exportHeaders = [
    t("adm.shops.colShop"), t("adm.shops.colCode"), t("adm.shops.colType"),
    t("adm.shops.colOwner"), t("common.phone"), t("common.address"),
    t("common.status"), t("adm.shops.colPlan"),
    t("adm.shops.colLastSale"), t("adm.shops.colRevenue30d"), t("common.createdAt"),
  ];
  const exportRows = filtered.map((s) => [
    s.name, s.code, s.parentShopName || "", s.ownerName || "",
    s.phone || "", s.address || "",
    shopStatus(s.status).label, s.plan || "",
    isoDate(stats[s.id]?.lastSaleAt),
    stats[s.id]?.revenue30d ?? 0,
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
          </div>
        </div>

        <div className="tw">
          {busy ? <SkeletonTable rows={7} cols={["wide", "text", "text", "text", "text"]} /> : (
            <table>
              <thead>
                <tr>
                  <th>{t("adm.shops.colShop")}</th><th>{t("adm.shops.colCode")}</th>
                  <th>{t("adm.shops.colType")}</th><th>{t("adm.shops.colOwner")}</th>
                  <th>{t("common.phone")}</th><th>{t("common.address")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("adm.shops.colPlan")}</th>
                  {/* Tartib TANA bilan bir xil bo'lishi shart: yangi ustunlar
                      holatdan keyin qo'shildi, "Yaratilgan" esa ulardan keyin. */}
                  <th>{t("adm.shops.colLastSale")}</th>
                  <th className="num">{t("adm.shops.colRevenue30d")}</th>
                  <th>{t("common.createdAt")}</th>
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
                          <span className="badge badge-green" style={{ fontSize:9 }}>{t("adm.shops.typeMain")}</span>
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
                      <td className="num ek-num" style={{ fontSize:12, fontWeight:700 }}>
                        {money(stats[shop.id]?.revenue30d || 0)}
                      </td>
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
    </div>
  );
}

// ── Yangi do'kon ──────────────────────────────────────────────
function AddShopModal({ onClose, onSaved, toast }) {
  const { t } = useT();
  const [shops, setShops] = useState([]);
  const [form, setForm] = useState({ name:"", code:"", phone:"+998 ", address:"", parentShopId: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    shopApi.getAll().then(res => setShops(res.data || [])).catch(() => {});
  }, []);

  const handlePhone = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("998")) val = val.substring(3);
    val = val.substring(0, 9);
    
    let fm = "+998";
    if (val.length > 0) fm += " (" + val.substring(0, 2);
    if (val.length > 2) fm += ") " + val.substring(2, 5);
    if (val.length > 5) fm += "-" + val.substring(5, 7);
    if (val.length > 7) fm += "-" + val.substring(7, 9);
    if (val.length === 0) fm += " ";
    setForm(p => ({ ...p, phone: fm }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error(t("adm.shops.nameCodeRequired")); return; }
    setSaving(true);
    try { 
      const payload = { 
        ...form, 
        phone: form.phone.replace(/[^+\d]/g, ""),
        parentShopId: form.parentShopId || null
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
        <input className="fi" value={form.name} onChange={set("name")} placeholder="Baraka Savdo" autoFocus />
      </FG>
      <FG label={`${t("adm.shops.fieldCode")} *`} hint={t("adm.shops.codeHint")}>
        <input className="fi ek-num" value={form.code} onChange={set("code")} placeholder="baraka-shop" />
      </FG>
      <div className="g2">
        <FG label={t("common.phone")}>
          <input className="fi ek-num" value={form.phone} onChange={handlePhone} placeholder="+998 (__) ___-__-__" />
        </FG>
        <FG label={t("common.address")}>
          <input className="fi" value={form.address} onChange={set("address")} placeholder="Toshkent, Chilonzor" />
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
    </Modal>
  );
}

// ── Do'konni tahrirlash ───────────────────────────────────────
// ShopStatus enum'idagi barcha qiymatlar (utils dan keladi)

function EditShopModal({ shop, onClose, onSaved, toast }) {
  const { t } = useT();
  const [form, setForm] = useState({ name: shop.name||"", phone: shop.phone||"+998 ", address: shop.address||"", status: shop.status||"ACTIVE" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handlePhone = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("998")) val = val.substring(3);
    val = val.substring(0, 9);
    
    let fm = "+998";
    if (val.length > 0) fm += " (" + val.substring(0, 2);
    if (val.length > 2) fm += ") " + val.substring(2, 5);
    if (val.length > 5) fm += "-" + val.substring(5, 7);
    if (val.length > 7) fm += "-" + val.substring(7, 9);
    if (val.length === 0) fm += " ";
    setForm(p => ({ ...p, phone: fm }));
  };

  const save = async () => {
    setSaving(true);
    try { 
      const payload = { ...form, phone: form.phone.replace(/[^+\d]/g, "") };
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
        <input className="fi" value={form.name} onChange={set("name")} />
      </FG>
      <FG label={t("adm.shops.fieldOwner")} hint={t("adm.shops.ownerHint")}>
        {/* Qattiq `#f1f5f9` qorong'i rejimda oq plastinka bo'lib chiqardi */}
        <input className="fi" value={shop.ownerName || t("adm.shops.ownerEmpty")} readOnly
          style={{ background:"var(--bg-sunken)", color:"var(--fg-secondary)", cursor:"not-allowed" }} />
      </FG>
      <div className="g2">
        <FG label={t("common.phone")}>
        <input className="fi ek-num" value={form.phone} onChange={handlePhone} placeholder="+998 (__) ___-__-__" />
      </FG>
        <FG label={t("common.address")}>
          <input className="fi" value={form.address} onChange={set("address")} />
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
      await userApi.create(shop.id, form);
      toast.success(t("adm.users.added"));
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
        ...(form.password ? { password: form.password } : {}),
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
            <input className="fi" value={form.fullName} onChange={set("fullName")} placeholder="Abdullayev Ali" autoFocus />
          </FG>
          <div className="g2">
            <FG label={`${t("common.username")} *`}>
              <input className="fi ek-num" value={form.username} onChange={set("username")} placeholder="ali_abdullayev" />
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
            <input className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
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
          <input className="fi ek-num" type="number" min="1" max="36"
            value={form.months} onChange={set("months")} />
        </FG>
      </div>
      <FG label={`${t("bill.amount")} *`}>
        <input className="fi ek-num" type="number" min="0" inputMode="numeric"
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
          <input className="fi ek-num" value={form.providerTransactionId}
            onChange={set("providerTransactionId")} />
        </FG>
      </div>
      <FG label={t("bill.note")}>
        <input className="fi" value={form.note} onChange={set("note")} />
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
