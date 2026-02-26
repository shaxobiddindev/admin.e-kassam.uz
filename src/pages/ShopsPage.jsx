import { useCallback, useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
import { fmtDate, SHOP_STATUS, ROLE_LABELS, ROLE_OPTIONS } from "../utils";
import Modal from "../components/Modal";
import { Loader, Empty, Search, FG, Badge, Avatar } from "../components/ui";

export default function ShopsPage({ toast }) {
  const [shops,   setShops]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("ALL");
  const [modal,   setModal]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setShops((await shopApi.getAll()).data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
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
    const label = isActive ? "bloklash" : "faollashtirish";
    if (!window.confirm(`"${shop.name}" ni ${label}ni tasdiqlaysizmi?`)) return;
    try {
      await shopApi.update(shop.id, { status: newStatus });
      toast.success(isActive ? "Do'kon bloklandi" : "Do'kon faollashtirildi");
      load();
    } catch (e) { toast.error(e.message); }
  };

  // O'chirish faqat ACTIVE/BLOCKED do'konlarda
  const handleDelete = async (shop) => {
    if (!window.confirm(`"${shop.name}" do'konini o'chirishni tasdiqlaysizmi?\n\nDiqqat: Bu amalni ortga qaytarib bo'lmaydi!`)) return;
    try { await shopApi.delete(shop.id); toast.success("Do'kon o'chirildi"); load(); }
    catch (e) { toast.error(e.message); }
  };

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
        <div style={{ background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, fontWeight:700, color:"#9a3412", display:"flex", alignItems:"center", gap:10 }}>
          <i className="fa-solid fa-circle-info" style={{ fontSize:16 }} />
          <span>
            {counts.DELETED} ta o'chirilgan do'kon mavjud. O'chirilgan do'konlar tiklanmaydi —
            agar kerak bo'lsa yangi do'kon yarating.
          </span>
        </div>
      )}

      <div className="card">
        <div className="c-head">
          <div className="tabs" style={{ flexWrap:"wrap" }}>
            {[
              { k:"ALL",       l:`Barchasi (${counts.ALL})`           },
              { k:"ACTIVE",    l:`Aktiv (${counts.ACTIVE})`            },
              { k:"BLOCKED",   l:`Bloklangan (${counts.BLOCKED})`      },
              { k:"SUSPENDED", l:`To'xtatilgan (${counts.SUSPENDED})`  },
              ...(counts.DELETED > 0 ? [{ k:"DELETED", l:`O'chirilgan (${counts.DELETED})` }] : []),
            ].map(({ k, l }) => (
              <button key={k} className={`tab ${filter===k?"on":""}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Search value={search} onChange={setSearch} placeholder="Nom, kod, telefon..." style={{ width:220 }} />
            <button className="btn btn-primary btn-sm" onClick={() => setModal("add")}>
              <i className="fa-solid fa-plus" /> Yangi do'kon
            </button>
          </div>
        </div>

        <div className="tw">
          {loading ? <Loader /> : (
            <table>
              <thead>
                <tr><th>Do'kon</th><th>Kod</th><th>Egasi</th><th>Telefon</th><th>Manzil</th><th>Status</th><th>Yaratilgan</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((shop) => {
                  const st = SHOP_STATUS[shop.status] || { label: shop.status, color:"gray" };
                  const isDeleted = shop.status === "DELETED";
                  return (
                    <tr key={shop.id} style={{ opacity: isDeleted ? 0.5 : 1 }}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:"var(--blue-l)", color:"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900 }}>
                            {shop.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700 }}>{shop.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-blue mono">{shop.code}</span></td>
                      <td style={{ fontWeight:700 }}>
                        {shop.ownerName || <span style={{ color:"var(--text3)", fontWeight:400 }}>—</span>}
                      </td>
                      <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--text3)" }}>{shop.phone||"—"}</td>
                      <td style={{ fontSize:12, color:"var(--text3)", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{shop.address||"—"}</td>
                      <td><Badge color={st.color}>{st.label}</Badge></td>
                      <td style={{ fontSize:12, color:"var(--text3)" }}>{fmtDate(shop.createdAt)}</td>
                      <td>
                        {isDeleted ? (
                          /* O'chirilgan do'konlarda hech qanday amal yo'q */
                          <span style={{ fontSize:11, color:"var(--text3)", fontStyle:"italic" }}>arxivda</span>
                        ) : (
                          <div style={{ display:"flex", gap:5 }}>
                            <button className="bic b-blue" title="Xodimlar"
                              onClick={() => setModal({ type:"users", shop })}>
                              <i className="fa-solid fa-users" />
                            </button>
                            <button className="bic b-blue" title="Tahrirlash"
                              onClick={() => setModal({ type:"edit", shop })}>
                              <i className="fa-solid fa-pen" />
                            </button>
                            {(shop.status === "ACTIVE" || shop.status === "BLOCKED") && (
                              <button
                                className={`bic ${shop.status==="ACTIVE" ? "b-yellow" : "b-green"}`}
                                title={shop.status==="ACTIVE" ? "Bloklash" : "Faollashtirish"}
                                onClick={() => handleToggleStatus(shop)}>
                                <i className={`fa-solid ${shop.status==="ACTIVE" ? "fa-ban" : "fa-check"}`} />
                              </button>
                            )}
                            <button className="bic b-red" title="O'chirish"
                              onClick={() => handleDelete(shop)}>
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8}><Empty icon="fa-store" title="Do'kon topilmadi" /></td></tr>
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
      {modal?.type === "users" && (
        <ShopUsersModal shop={modal.shop} onClose={() => setModal(null)} onReload={load} toast={toast} />
      )}
    </div>
  );
}

// ── Yangi do'kon ──────────────────────────────────────────────
function AddShopModal({ onClose, onSaved, toast }) {
  const [form, setForm] = useState({ name:"", code:"", phone:"", address:"" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Nom va kod majburiy"); return; }
    setSaving(true);
    try { await shopApi.create(form); toast.success("Do'kon yaratildi"); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Yangi do'kon yaratish" onClose={onClose} footer={
      <><button className="btn btn-outline btn-sm" onClick={onClose}>Bekor</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Yaratilmoqda...</> : <><i className="fa-solid fa-plus" /> Yaratish</>}
        </button></>
    }>
      <FG label="Do'kon nomi *">
        <input className="fi" value={form.name} onChange={set("name")} placeholder="Baraka Savdo" autoFocus />
      </FG>
      <FG label="Unikal kod *" hint="Kichik harf, raqam, _ va - belgilari. Masalan: baraka-shop">
        <input className="fi mono" value={form.code} onChange={set("code")} placeholder="baraka-shop" />
      </FG>
      <div className="g2">
        <FG label="Telefon">
          <input className="fi mono" value={form.phone} onChange={set("phone")} placeholder="+998901234567" />
        </FG>
        <FG label="Manzil">
          <input className="fi" value={form.address} onChange={set("address")} placeholder="Toshkent, Chilonzor" />
        </FG>
      </div>
    </Modal>
  );
}

// ── Do'konni tahrirlash ───────────────────────────────────────
const STATUS_OPTIONS = ["ACTIVE", "BLOCKED", "SUSPENDED"];

function EditShopModal({ shop, onClose, onSaved, toast }) {
  const [form, setForm] = useState({ name: shop.name||"", phone: shop.phone||"", address: shop.address||"", status: shop.status||"ACTIVE" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try { await shopApi.update(shop.id, form); toast.success("Saqlandi"); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Tahrirlash — ${shop.name}`} onClose={onClose} footer={
      <><button className="btn btn-outline btn-sm" onClick={onClose}>Bekor</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saqlanmoqda...</> : <><i className="fa-solid fa-check" /> Saqlash</>}
        </button></>
    }>
      <FG label="Do'kon nomi">
        <input className="fi" value={form.name} onChange={set("name")} />
      </FG>
      <FG label="Do'kon egasi" hint="Owner foydalanuvchi ismidan avtomatik olinadi">
        <input className="fi" value={shop.ownerName || "Owner qo'shilmagan"} readOnly
          style={{ background:"#f1f5f9", color:"var(--text3)", cursor:"not-allowed" }} />
      </FG>
      <div className="g2">
        <FG label="Telefon">
          <input className="fi mono" value={form.phone} onChange={set("phone")} />
        </FG>
        <FG label="Manzil">
          <input className="fi" value={form.address} onChange={set("address")} />
        </FG>
      </div>
      <FG label="Status">
        <select className="fi" value={form.status} onChange={set("status")}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{SHOP_STATUS[s]?.label || s}</option>)}
        </select>
      </FG>
    </Modal>
  );
}

// ── Do'kon xodimlari modal ────────────────────────────────────
function ShopUsersModal({ shop, onClose, onReload, toast }) {
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
    if (!form.fullName.trim()) { toast.error("Ism Familiya kiriting"); return; }
    if (!form.username.trim()) { toast.error("Username kiriting"); return; }
    if (!form.password)        { toast.error("Parol kiriting"); return; }
    setSaving(true);
    try {
      await userApi.create(shop.id, form);
      toast.success("Xodim qo'shildi");
      setView("list"); load(); onReload();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!form.fullName.trim()) { toast.error("Ism Familiya kiriting"); return; }
    setSaving(true);
    try {
      await userApi.update(shop.id, view.user.id, { fullName: form.fullName });
      if (form.password) await userApi.changePass(shop.id, view.user.id, form.password);
      toast.success("Saqlandi");
      setView("list"); load(); onReload();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    if (!window.confirm(`${u.fullName} ni ${u.enabled?"bloklash":"faollashtirish"}ni tasdiqlaysizmi?`)) return;
    try {
      await userApi.toggleBlock(shop.id, u.id);
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, enabled:!u.enabled} : x));
      toast.success(u.enabled ? "Bloklandi" : "Faollashtirildi");
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
    <Modal title={`Xodimlar — ${shop.name}`} onClose={onClose} size="md" footer={
      isList ? (
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="fa-solid fa-user-plus" />
          {!hasOwner ? " Owner qo'shish (majburiy)" : " Xodim qo'shish"}
        </button>
      ) : (
        <><button className="btn btn-outline btn-sm" onClick={() => setView("list")}>
            <i className="fa-solid fa-arrow-left" /> Orqaga
          </button>
          <button className="btn btn-primary btn-sm" onClick={isAdd ? handleAdd : handleEdit} disabled={saving}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saqlanmoqda...</> : <><i className="fa-solid fa-check" /> {isAdd?"Qo'shish":"Saqlash"}</>}
          </button></>
      )
    }>
      {isAdd && (
        <div>
          {!hasOwner && (
            <div style={{ background:"#fffbeb", border:"1.5px solid #fcd34d", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, fontWeight:700, color:"#92400e", display:"flex", gap:8 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginTop:1 }} />
              Avval do'kon uchun Owner qo'shilishi shart
            </div>
          )}
          <FG label="Ism Familiya *">
            <input className="fi" value={form.fullName} onChange={set("fullName")} placeholder="Abdullayev Ali" autoFocus />
          </FG>
          <div className="g2">
            <FG label="Username *">
              <input className="fi mono" value={form.username} onChange={set("username")} placeholder="ali_abdullayev" />
            </FG>
            <FG label="Parol *">
              <input className="fi" type="password" value={form.password} onChange={set("password")} placeholder="min 6 belgi" />
            </FG>
          </div>
          <FG label="Rol *">
            <select className="fi" value={form.role} onChange={set("role")}>
              {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]||r}</option>)}
            </select>
          </FG>
        </div>
      )}

      {isEdit && (
        <div>
          <FG label="Ism Familiya">
            <input className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
          </FG>
          <FG label="Username" hint="O'zgartirib bo'lmaydi">
            <input className="fi mono" value={form.username} readOnly
              style={{ background:"#f1f5f9", color:"var(--text3)", cursor:"not-allowed" }} />
          </FG>
          <FG label="Yangi parol" hint="Bo'sh qoldirsangiz o'zgarmaydi">
            <input className="fi" type="password" value={form.password} onChange={set("password")} placeholder="Yangi parol (ixtiyoriy)" />
          </FG>
        </div>
      )}

      {isList && (
        loading ? <Loader /> : users.length === 0 ? (
          <Empty icon="fa-users" title="Xodim yo'q" subtitle="Owner qo'shishdan boshlang" />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {users.map((u) => {
              const roles = u.roles || [];
              const isOwner = roles.some(r => (r.name||r.type||r) === "OWNER");
              return (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:11, border:"1.5px solid var(--border)", background:"white", opacity: u.enabled ? 1 : 0.55 }}>
                  <Avatar name={u.fullName} size={36} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                      {u.fullName}
                      {isOwner && <span style={{ fontSize:10, background:"#fef3c7", color:"#92400e", borderRadius:5, padding:"1px 6px", fontWeight:700 }}>OWNER</span>}
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:"var(--text3)" }}>@{u.username}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <Badge color={u.enabled?"green":"red"}>{u.enabled?"Aktiv":"Blok"}</Badge>
                    <button className="bic b-blue" title="Tahrirlash" onClick={() => openEdit(u)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      className={`btn btn-sm ${u.enabled ? "btn-danger" : "btn-activate"}`}
                      onClick={() => handleToggle(u)}>
                      <i className={`fa-solid ${u.enabled ? "fa-ban" : "fa-check"}`} />
                      {u.enabled ? "Blok" : "Faollashtirish"}
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
