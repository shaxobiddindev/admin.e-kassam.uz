import { useCallback, useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
import { roleEntry, roleLabel } from "../utils";
import { useT } from "../lib/ek-i18n";
import Modal from "../components/Modal";
import { Empty, Search, FG, Badge, Avatar } from "../components/ui";
import { useConfirm } from "../context/ConfirmProvider";
import Select from "../components/ek/Select";
import { SkeletonList, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";

export default function UsersPage({ toast }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [shops,        setShops]        = useState([]);
  const [users,        setUsers]        = useState([]);
  const [selShop,      setSelShop]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  // Tez javobda skeleton umuman chizilmaydi; chizilsa kamida 400ms turadi.
  const busy = useLoading(loading);
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
      title: t(isBlocking ? "adm.users.blockTitle" : "adm.users.unblockTitle"),
      message: t(isBlocking ? "adm.users.blockMsg" : "adm.users.unblockMsg", { name: u.fullName }),
      type: isBlocking ? "warning" : "info",
      confirmText: t(isBlocking ? "adm.shops.block" : "adm.shops.activate"),
    });
    if (!ok) return;
    try {
      await userApi.toggleBlock(selShop.id, u.id);
      toast.success(t(u.enabled ? "adm.users.blockedToast" : "adm.users.activatedToast"));
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
              <i className="fa-solid fa-store" aria-hidden="true" /> {t("nav.shops")}
            </span>
          </div>
          {shopsLoading ? <SkeletonList rows={3} avatar={false} /> : shops.length === 0
            ? <Empty icon="fa-store" text={t("adm.users.noShops")} />
            : (
              <div style={{ padding:"4px 0" }}>
                {shops.map(shop => (
                  /* Tugma, `<div>` emas: klaviatura bilan yetib boriladi
                     va ekran o'quvchi uni bosiladigan deb o'qiydi. */
                  <button key={shop.id} type="button" onClick={() => setSelShop(shop)}
                    aria-current={selShop?.id === shop.id ? "true" : undefined}
                    style={{
                      display:"block", width:"100%", textAlign:"left", border:"none",
                      fontFamily:"inherit", minHeight:"var(--hit-min)",
                      padding:"9px 14px", cursor:"pointer", transition:".15s",
                      background: selShop?.id === shop.id ? "var(--bg-brand-subtle)" : "transparent",
                      borderLeft: selShop?.id === shop.id ? "3px solid var(--bg-brand)" : "3px solid transparent",
                    }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{shop.name}</div>
                    <div className="ek-num" style={{ fontSize:11, color:"var(--fg-secondary)" }}>{shop.code}</div>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* O'ng: foydalanuvchilar */}
      <div style={{ flex:1, minWidth:0 }}>
        {!selShop ? (
          <div className="card"><Empty icon="fa-store" text={t("adm.users.pickShop")} /></div>
        ) : (
          <div className="card">
            <div className="c-head">
              <div>
                <span className="c-title">
                  <i className="fa-solid fa-users" aria-hidden="true" /> {selShop.name}
                </span>
                <div style={{ fontSize:12, color:"var(--fg-secondary)", marginTop:3 }}>
                  {t("adm.users.summary", {
                    total:   users.length,
                    active:  users.filter(u => u.enabled).length,
                    blocked: users.filter(u => !u.enabled).length,
                  })}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Search value={search} onChange={setSearch}
                  placeholder={t("adm.users.searchPlaceholder")} style={{ width:200 }} />
                <button className={`btn btn-sm ${!hasOwner ? "btn-green" : "btn-primary"}`} onClick={() => setAddOpen(true)}>
                  <i className={`fa-solid ${!hasOwner ? "fa-crown" : "fa-user-plus"}`} />
                  {t(hasOwner ? "common.add" : "adm.users.addOwner")}
                </button>
              </div>
            </div>

            {!hasOwner && (
              <div className="ek-note ek-note--warning" style={{ margin:"0 18px 14px" }}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                {t("adm.users.ownerMissing")}
              </div>
            )}

            {busy ? <SkeletonList rows={6} /> : (
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>{t("adm.users.colUser")}</th>
                      <th>{t("common.username")}</th>
                      <th>{t("common.role")}</th>
                      <th>{t("common.status")}</th>
                      <th />
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
                                {isOwner && <span className="badge" style={{ fontSize:10, background:"var(--ek-role-owner-bg)", color:"var(--ek-role-owner)" }}>{t("enum.role.OWNER.short")}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="ek-num" style={{ fontSize:12, color:"var(--fg-secondary)" }}>
                            @{u.username}
                          </td>
                          <td>
                            {roles.map(r => {
                              const rn = r.name || r.type || r;
                              const re = roleEntry(rn);
                              return (
                                <span key={rn} className="badge"
                                      style={{ background: re.bg || "var(--bg-sunken)", color: re.color || "var(--fg-secondary)" }}>
                                  {re.label}
                                </span>
                              );
                            })}
                          </td>
                          <td>
                            <Badge color={u.enabled ? "green" : "red"}>
                              {t(u.enabled ? "common.active" : "common.blocked")}
                            </Badge>
                          </td>
                          <td>
                            <div style={{ display:"flex", gap:6 }}>
                              <button className="btn btn-sm btn-outline"
                                onClick={() => setEditUser(u)} title={t("common.edit")}>
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                className={`btn btn-sm ${u.enabled ? "btn-danger" : "btn-activate"}`}
                                onClick={() => handleToggle(u)}>
                                <i className={`fa-solid ${u.enabled ? "fa-ban" : "fa-check"}`} />
                                {t(u.enabled ? "adm.shops.block" : "adm.shops.activate")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={5}><Empty icon="fa-user-slash" text={t("common.notFound")} /></td></tr>
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
          hasOwner={hasOwner}
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
  const { t } = useT();
  const defaultRole = !hasOwner ? "OWNER" : roleOpts[0];
  const [form,   setForm]   = useState({ fullName:"", username:"", password:"", role: defaultRole });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName.trim()) { toast.error(t("adm.users.errName")); return; }
    if (!form.username.trim()) { toast.error(t("adm.users.errUsername")); return; }
    if (!form.password)        { toast.error(t("adm.users.errPassword")); return; }
    setSaving(true);
    try { await userApi.create(shop.id, form); toast.success(t("adm.users.added")); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally   { setSaving(false); }
  };

  return (
    <Modal title={t("adm.users.newTitle", { name: shop.name })} onClose={onClose} footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><Spinner /> {t("common.adding")}</>
                  : <><i className="fa-solid fa-user-plus" /> {t("common.add")}</>}
        </button>
      </>
    }>
      {!hasOwner && (
        <div className="ek-note ek-note--warning">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          {t("adm.users.ownerMissingRole")}
        </div>
      )}
      <FG label={`${t("common.fullName")} *`}>
        <input className="fi" value={form.fullName} onChange={set("fullName")}
          placeholder="Abdullayev Ali" autoFocus />
      </FG>
      <div className="g2">
        <FG label={`${t("common.username")} *`}>
          <input className="fi ek-num" value={form.username} onChange={set("username")}
            placeholder="ali_abdullayev" />
        </FG>
        <FG label={`${t("common.password")} *`}>
          <input className="fi" type="password" value={form.password} onChange={set("password")}
            placeholder={t("adm.users.passwordMin")} />
        </FG>
      </div>
      <FG label={`${t("common.role")} *`}>
        <Select
          block variant="field" ariaLabel={t("common.role")} disabled={!hasOwner}
          value={form.role}
          onChange={(v) => set("role")({ target: { value: v } })}
          options={roleOpts.map(r => ({ value: r, label: roleLabel(r), icon: "fa-user-tag" }))}
        />
      </FG>
    </Modal>
  );
}

// ── Xodimni tahrirlash ────────────────────────────────────────
function EditUserModal({ shop, user, hasOwner, onClose, onSaved, toast }) {
  const { t } = useT();
  const [tab,    setTab]    = useState("info");
  const allRoles = (user.roles || []).map(r => r.name || r.type || r);
  const isOwner  = allRoles.includes("OWNER");
  // ⚠ `allRoles[0]` ISHLATILMAYDI: backend rollarni `Set` da qaytaradi va
  // tartibi barqaror emas. Do'kon admini {SHOP_ADMIN, STOREKEEPER, CASHIER}
  // olgani uchun bu yerda tasodifan "Kassir" ko'rinib, saqlanganda xodim
  // chindan kassirga tushib qolardi. Endi ierarxiyaning ENG YUQORISI olinadi.
  const RANK = ["OWNER", "SHOP_ADMIN", "STOREKEEPER", "CASHIER"];
  const curRole  = isOwner ? "OWNER" : (RANK.find((r) => allRoles.includes(r)) || allRoles[0] || "");
  const roleOpts = isOwner ? ["OWNER"] : (!hasOwner ? ["OWNER","SHOP_ADMIN","STOREKEEPER","CASHIER"] : ["SHOP_ADMIN","STOREKEEPER","CASHIER"]);
  const [form,   setForm]   = useState({ fullName: user.fullName || "", role: curRole });
  const [pass,   setPass]   = useState({ newPass:"", confirm:"" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const saveInfo = async () => {
    if (!form.fullName.trim()) { toast.error(t("adm.users.errName")); return; }
    setSaving(true);
    try { await userApi.update(shop.id, user.id, { fullName:form.fullName, role:form.role }); toast.success(t("common.saved")); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally   { setSaving(false); }
  };

  const savePass = async () => {
    if (!pass.newPass)                 { toast.error(t("adm.users.errPassword")); return; }
    if (pass.newPass.length < 6)       { toast.error(t("adm.users.errPassMin")); return; }
    if (pass.newPass !== pass.confirm) { toast.error(t("adm.users.errPassMatch")); return; }
    setSaving(true);
    try { await userApi.changePass(shop.id, user.id, pass.newPass); toast.success(t("adm.users.passUpdated")); onSaved(); }
    catch (e) { toast.error(e.message); }
    finally   { setSaving(false); }
  };

  const tabStyle = (k) => ({
    flex:1, padding:"8px 0", border:"none", borderRadius:6, fontSize:12, fontWeight:700,
    fontFamily:"var(--font)", cursor:"pointer",
    background: tab === k ? "var(--bg-surface)" : "transparent",
    color: tab === k ? "var(--fg-brand)" : "var(--fg-secondary)",
    boxShadow: tab === k ? "0 1px 4px rgba(0,0,0,.1)" : "none",
  });

  return (
    <Modal title={t("adm.users.editTitle", { name: user.fullName })} onClose={onClose} footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary btn-sm"
          onClick={tab === "info" ? saveInfo : savePass} disabled={saving}>
          {saving ? <><Spinner /> {t("common.saving")}</>
                  : <><i className="fa-solid fa-check" /> {t("common.save")}</>}
        </button>
      </>
    }>
      <div style={{ display:"flex", background:"var(--bg-sunken)", borderRadius:8, padding:3, marginBottom:16, gap:3 }}>
        <button type="button" style={tabStyle("info")} onClick={() => setTab("info")}>
          {t("adm.users.tabInfo")}
        </button>
        <button type="button" style={tabStyle("pass")} onClick={() => setTab("pass")}>
          {t("adm.users.tabPass")}
        </button>
      </div>

      {tab === "info" ? (
        <>
          <FG label={`${t("common.fullName")} *`}>
            <input className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
          </FG>
          <FG label={t("common.role")} hint={isOwner ? t("adm.users.ownerRoleLocked") : ""}>
            <Select
              block variant="field" ariaLabel={t("common.role")} disabled={isOwner}
              value={form.role}
              onChange={(v) => set("role")({ target: { value: v } })}
              options={roleOpts.map(r => ({ value: r, label: roleLabel(r), icon: "fa-user-tag" }))}
            />
          </FG>
        </>
      ) : (
        <>
          <FG label={`${t("common.newPassword")} *`}>
            <input className="fi" type="password" value={pass.newPass}
              onChange={e => setPass(p => ({ ...p, newPass: e.target.value }))}
              placeholder={t("adm.users.passwordMin")} autoFocus />
          </FG>
          <FG label={`${t("common.confirmPassword")} *`}>
            <input className="fi" type="password" value={pass.confirm}
              onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))}
              placeholder={t("common.confirmPassword")} />
          </FG>
        </>
      )}
    </Modal>
  );
}
