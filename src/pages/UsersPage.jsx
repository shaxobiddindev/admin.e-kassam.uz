import { useCallback, useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
import { ROLE_LABELS } from "../utils";
import Modal from "../components/Modal";
import { Loader, Empty, Search, FG, Badge, Avatar } from "../components/ui";
import { useConfirm } from "../context/ConfirmProvider";

export default function UsersPage({ toast }) {
  const confirm = useConfirm();
  const [shops,        setShops]        = useState([]);
  const [users,        setUsers]        = useState([]);
  const [selShop,      setSelShop]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [search,       setSearch]       = useState("");
  const [addOpen,      setAddOpen]      = useState(false);
  const [editUser,     setEditUser]     = useState(null);

  useEffect(() => {
    shopApi.getAll()
      .then(r => { const l = r.data || []; setShops(l); if (l.length) setSelShop(l[0]); })
      .catch(e => toast.error(e.message))
      .finally(() => setShopsLoading(false));
  }, []);

  const loadUsers = useCallback((shop) => {
    if (!shop) return;
    setLoading(true);
    userApi.getByShop(shop.id)
      .then(r => setUsers(r.data || []))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(selShop); }, [selShop]);

  const hasOwner   = users.some(u => (u.roles||[]).some(r => (r.name||r.type||r) === "OWNER"));
  const roleOpts   = hasOwner
    ? ["SHOP_ADMIN","STOREKEEPER","CASHIER"]
    : ["OWNER","SHOP_ADMIN","STOREKEEPER","CASHIER"];

  const handleToggle = async (u) => {
    const isBlocking = u.enabled;
    const ok = await confirm({
      title: isBlocking ? "Xodimni bloklash" : "Xodimni faollashtirish",
      message: isBlocking
        ? `Chindan ham ${u.fullName} ni bloklamoqchimisiz? U tizimga kira olmaydi.`
        : `${u.fullName} ni tizimga kirishini tiklamoqchimisiz?`,
      type: isBlocking ? "warning" : "info",
      confirmText: isBlocking ? "Bloklash" : "Faollashtirish",
    });
    if (!ok) return;
    try {
      await userApi.toggleBlock(selShop.id, u.id);
      toast.success(u.enabled ? "Bloklandi" : "Faollashtirildi");
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, enabled: !x.enabled } : x));
    } catch (e) { toast.error(e.message); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.fullName?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>

      {/* Chap: do'konlar */}
      <div style={{ width:220, flexShrink:0 }}>
        <div className="card">
          <div className="c-head" style={{ padding:"12px 14px" }}>
            <span className="c-title" style={{ fontSize:13 }}>
              <i className="fa-solid fa-store" /> Do'konlar
            </span>
          </div>
          {shopsLoading ? <Loader /> : shops.length === 0
            ? <Empty icon="fa-store" text="Do'kon yo'q" />
            : (
              <div style={{ padding:"4px 0" }}>
                {shops.map(shop => (
                  <div key={shop.id} onClick={() => setSelShop(shop)} style={{
                    padding:"9px 14px", cursor:"pointer", transition:".15s",
                    background: selShop?.id === shop.id ? "var(--blue-l)" : "transparent",
                    borderLeft: selShop?.id === shop.id ? "3px solid var(--blue)" : "3px solid transparent",
                  }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{shop.name}</div>
                    <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"monospace" }}>{shop.code}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* O'ng: foydalanuvchilar */}
      <div style={{ flex:1, minWidth:0 }}>
        {!selShop ? (
          <div className="card"><Empty icon="fa-store" text="Do'kon tanlang" /></div>
        ) : (
          <div className="card">
            <div className="c-head">
              <div>
                <span className="c-title">
                  <i className="fa-solid fa-users" /> {selShop.name}
                </span>
                <div style={{ fontSize:12, color:"var(--text3)", marginTop:3 }}>
                  Jami: <strong>{users.length}</strong> &nbsp;·&nbsp;
                  Aktiv: <strong>{users.filter(u=>u.enabled).length}</strong> &nbsp;·&nbsp;
                  Bloklangan: <strong>{users.filter(u=>!u.enabled).length}</strong>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Search value={search} onChange={setSearch}
                  placeholder="Ism yoki username..." style={{ width:200 }} />
                <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
                  <i className="fa-solid fa-user-plus" /> Qo'shish
                </button>
              </div>
            </div>

            {!hasOwner && (
              <div style={{ margin:"0 18px 14px", background:"#fffbeb", border:"1.5px solid #fcd34d", borderRadius:10, padding:"10px 14px", fontSize:12, fontWeight:700, color:"#92400e", display:"flex", gap:8 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ flexShrink:0, marginTop:1 }} />
                Owner qo'shilmagan. Boshqa rollarni qo'shish uchun avval Owner tayinlang.
              </div>
            )}

            {loading ? <Loader /> : (
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Foydalanuvchi</th>
                      <th>Username</th>
                      <th>Rol</th>
                      <th>Holat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map(u => {
                      const roles   = u.roles || [];
                      const isOwner = roles.some(r => (r.name||r.type||r) === "OWNER");
                      return (
                        <tr key={u.id} style={{ opacity: u.enabled ? 1 : 0.55 }}>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <Avatar name={u.fullName} size={32} />
                              <div>
                                <div style={{ fontWeight:700 }}>{u.fullName}</div>
                                {isOwner && <span style={{ fontSize:10, background:"var(--blue)", color:"white", padding:"1px 7px", borderRadius:20, fontWeight:700 }}>OWNER</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--text3)" }}>
                            @{u.username}
                          </td>
                          <td>
                            {roles.map(r => {
                              const rn = r.name || r.type || r;
                              return <Badge key={rn} color={isOwner ? "blue" : "gray"}>{ROLE_LABELS[rn] || rn}</Badge>;
                            })}
                          </td>
                          <td>
                            <Badge color={u.enabled ? "green" : "red"}>
                              {u.enabled ? "Aktiv" : "Bloklangan"}
                            </Badge>
                          </td>
                          <td>
                            <div style={{ display:"flex", gap:6 }}>
                              <button className="btn btn-sm btn-outline"
                                onClick={() => setEditUser(u)} title="Tahrirlash">
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                className={`btn btn-sm ${u.enabled ? "btn-danger" : "btn-activate"}`}
                                onClick={() => handleToggle(u)}>
                                <i className={`fa-solid ${u.enabled ? "fa-ban" : "fa-check"}`} />
                                {u.enabled ? "Bloklash" : "Faollashtirish"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={5}><Empty icon="fa-user-slash" text="Topilmadi" /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Qo'shish modali */}
      {addOpen && selShop && (
        <AddUserModal
          shop={selShop}
          roleOpts={roleOpts}
          hasOwner={hasOwner}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); loadUsers(selShop); }}
          toast={toast}
        />
      )}

      {/* Tahrirlash modali */}
      {editUser && selShop && (
        <EditUserModal
          shop={selShop}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); loadUsers(selShop); }}
          toast={toast}
        />
      )}
    </div>
  );
}

// ── Yangi xodim ───────────────────────────────────────────────
function AddUserModal({ shop, roleOpts, hasOwner, onClose, onSaved, toast }) {
  const defaultRole = !hasOwner ? "OWNER" : roleOpts[0];
  const [form,   setForm]   = useState({ fullName:"", username:"", password:"", role: defaultRole });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName.trim()) { toast.error("Ism Familiyani kiriting"); return; }
    if (!form.username.trim()) { toast.error("Usernameni kiriting"); return; }
    if (!form.password)        { toast.error("Parolni kiriting"); return; }
    setSaving(true);
    try { await userApi.create(shop.id, form); toast.success("Xodim qo'shildi"); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally   { setSaving(false); }
  };

  return (
    <Modal title={`Yangi xodim — ${shop.name}`} onClose={onClose} footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Bekor</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Qo'shilmoqda...</>
                  : <><i className="fa-solid fa-user-plus" /> Qo'shish</>}
        </button>
      </>
    }>
      {!hasOwner && (
        <div style={{ background:"#fffbeb", border:"1.5px solid #fcd34d", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, fontWeight:700, color:"#92400e" }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight:6 }} />
          Owner qo'shilmagan. Rol majburiy OWNER bo'lishi kerak.
        </div>
      )}
      <FG label="Ism Familiya *">
        <input className="fi" value={form.fullName} onChange={set("fullName")}
          placeholder="Abdullayev Ali" autoFocus />
      </FG>
      <div className="g2">
        <FG label="Username *">
          <input className="fi mono" value={form.username} onChange={set("username")}
            placeholder="ali_abdullayev" />
        </FG>
        <FG label="Parol *">
          <input className="fi" type="password" value={form.password} onChange={set("password")}
            placeholder="min 6 belgi" />
        </FG>
      </div>
      <FG label="Rol *">
        <select className="fi" value={form.role} onChange={set("role")} disabled={!hasOwner}>
          {roleOpts.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
          ))}
        </select>
      </FG>
    </Modal>
  );
}

// ── Xodimni tahrirlash ────────────────────────────────────────
function EditUserModal({ shop, user, onClose, onSaved, toast }) {
  const [tab,    setTab]    = useState("info");
  const allRoles = (user.roles || []).map(r => r.name || r.type || r);
  const isOwner  = allRoles.includes("OWNER");
  const curRole  = isOwner ? "OWNER" : (allRoles[0] || "");
  const roleOpts = isOwner ? ["OWNER"] : ["SHOP_ADMIN","STOREKEEPER","CASHIER"];
  const [form,   setForm]   = useState({ fullName: user.fullName || "", role: curRole });
  const [pass,   setPass]   = useState({ newPass:"", confirm:"" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const saveInfo = async () => {
    if (!form.fullName.trim()) { toast.error("Ism Familiya bo'sh bo'lmaydi"); return; }
    setSaving(true);
    try { await userApi.update(shop.id, user.id, { fullName:form.fullName, role:form.role }); toast.success("Saqlandi"); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally   { setSaving(false); }
  };

  const savePass = async () => {
    if (!pass.newPass)                 { toast.error("Yangi parolni kiriting"); return; }
    if (pass.newPass.length < 6)       { toast.error("Parol kamida 6 belgi"); return; }
    if (pass.newPass !== pass.confirm) { toast.error("Parollar mos kelmaydi"); return; }
    setSaving(true);
    try { await userApi.changePass(shop.id, user.id, pass.newPass); toast.success("Parol yangilandi"); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally   { setSaving(false); }
  };

  const tabStyle = (k) => ({
    flex:1, padding:"8px 0", border:"none", borderRadius:6, fontSize:12, fontWeight:700,
    fontFamily:"var(--font)", cursor:"pointer",
    background: tab === k ? "white" : "transparent",
    color: tab === k ? "var(--blue)" : "var(--text2)",
    boxShadow: tab === k ? "0 1px 4px rgba(0,0,0,.1)" : "none",
  });

  return (
    <Modal title={`Tahrirlash — ${user.fullName}`} onClose={onClose} footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Bekor</button>
        <button className="btn btn-primary btn-sm"
          onClick={tab === "info" ? saveInfo : savePass} disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saqlanmoqda...</>
                  : <><i className="fa-solid fa-check" /> Saqlash</>}
        </button>
      </>
    }>
      <div style={{ display:"flex", background:"#f1f5f9", borderRadius:8, padding:3, marginBottom:16, gap:3 }}>
        <button type="button" style={tabStyle("info")} onClick={() => setTab("info")}>
          Ma'lumotlar
        </button>
        <button type="button" style={tabStyle("pass")} onClick={() => setTab("pass")}>
          Parol yangilash
        </button>
      </div>

      {tab === "info" ? (
        <>
          <FG label="Ism Familiya *">
            <input className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
          </FG>
          <FG label="Rol" hint={isOwner ? "Owner rolini o'zgartirish mumkin emas" : ""}>
            <select className="fi" value={form.role} onChange={set("role")} disabled={isOwner}>
              {roleOpts.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
          </FG>
        </>
      ) : (
        <>
          <FG label="Yangi parol *">
            <input className="fi" type="password" value={pass.newPass}
              onChange={e => setPass(p => ({ ...p, newPass: e.target.value }))}
              placeholder="min 6 belgi" autoFocus />
          </FG>
          <FG label="Tasdiqlang *">
            <input className="fi" type="password" value={pass.confirm}
              onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Qayta kiriting" />
          </FG>
        </>
      )}
    </Modal>
  );
}
