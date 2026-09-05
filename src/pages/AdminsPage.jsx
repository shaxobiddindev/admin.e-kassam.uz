import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import { fmtDate, ADMIN_ROLE_LABELS, adminRole } from "../utils";
import { useT } from "../lib/ek-i18n";
import Modal from "../components/Modal";
import Select from "../components/ek/Select";
import { Empty, FG, Badge, Avatar, Search } from "../components/ui";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { useConfirm } from "../context/ConfirmProvider";
import { NameField, UsernameField, PhoneField, EmailField } from "../components/ek/EkFields";
import { phoneInput } from "../lib/ek-input";
import { rankItems } from "../lib/ek-search";
import DataFilter, { useDataFilter, SortTh } from "../components/ek/DataFilter";

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN HISOBLARI — faqat bosh admin (V50)

   ⚠ NEGA KERAK BO'LDI. Admin hisobi faqat ilova birinchi ko'tarilganda
   tug'ilardi va ikkinchisini qo'shishning yagona yo'li bazaga qo'lda
   `INSERT` yozish edi. Amalda bu degani — hamma bitta `superadmin`
   hisobidan foydalanadi va audit jurnalidagi "kim qildi" ustuni
   ma'nosini yo'qotadi.

   ⚠ BU EKRAN HIMOYA EMAS. Yo'lning o'zi serverda `SUPER_ADMIN` ga
   qamalgan va har bir amal `ADMIN_MANAGE` talab qiladi. Bu yerda
   ko'rsatilgan har bir cheklov (o'zini o'chira olmaslik, `ADMIN_MANAGE`
   ni bera olmaslik) SERVERDA ham bor — ekran uni faqat oldindan
   tushuntiradi, foydalanuvchi bosib 403 olmasin uchun.
   ══════════════════════════════════════════════════════════════════════════ */

/** Ruxsatlarni ekranda guruhlash — 25 ta yassi ro'yxat o'qib bo'lmaydi. */
const GROUPS = [
  { key: "adm.perm.group.shops",    icon: "fa-store",
    prefixes: ["SHOP_VIEW", "SHOP_CREATE", "SHOP_UPDATE", "SHOP_STATUS", "SHOP_DELETE", "SHOP_FEATURES"] },
  { key: "adm.perm.group.staff",    icon: "fa-users",
    prefixes: ["SHOP_USER_"] },
  { key: "adm.perm.group.billing",  icon: "fa-credit-card",
    prefixes: ["BILLING_"] },
  { key: "adm.perm.group.support",  icon: "fa-inbox",
    prefixes: ["CONTACT_", "CATALOG_"] },
  { key: "adm.perm.group.control",  icon: "fa-shield-halved",
    prefixes: ["AUDIT_", "NOTIFICATION_", "BACKUP_", "CUSTOMER_"] },
  { key: "adm.perm.group.admins",   icon: "fa-user-shield",
    prefixes: ["ADMIN_"] },
];

const groupOf = (permission) =>
  GROUPS.find((g) => g.prefixes.some((p) =>
    p.endsWith("_") ? permission.startsWith(p) : permission === p));

export default function AdminsPage({ toast, user }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [admins,  setAdmins]  = useState([]);
  const [perms,   setPerms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([adminApi.getAll(), adminApi.permissions()]);
      setAdmins(a.data || []);
      setPerms(p.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ⚠ QIDIRUV — kassadagi bilan BIR XIL algoritm (`lib/ek-search.js`).
     Oddiy `includes` kirillcha yozuvni ham, apostrofni ham, xato
     yozilgan harfni ham topa olmasdi. */
  /* ══ USTUNLAR BO'YICHA FILTR (V68) ═══════════════════════════════════
     ⚠ «2FA» — HA/YO'Q ustuni: «himoyalanmagan hisoblar» bitta bosishda
     ko'rinishi kerak, bu xavfsizlik savoli. */
  const COLS = useMemo(() => [
    { key: "name",  label: t("adm.admins.colAdmin"), type: "text",
      get: (a) => `${a.fullName || ""} ${a.username || ""}` },
    { key: "role",  label: t("adm.admins.colRole"),  type: "enum",
      options: Object.keys(ADMIN_ROLE_LABELS).map((k) => ({ value: k, label: adminRole(k).label })),
      get: (a) => a.role },
    { key: "st",    label: t("common.status"),       type: "enum",
      options: [{ value: "on",  label: t("common.active") },
                { value: "off", label: t("common.blocked") }],
      get: (a) => (a.enabled ? "on" : "off") },
    { key: "perms", label: t("adm.admins.colPerms"), type: "number",
      get: (a) => a.permissions?.length ?? 0 },
    { key: "fa",    label: t("adm.admins.col2fa"),   type: "bool", get: (a) => !!a.totpEnabled },
    { key: "made",  label: t("common.date"),         type: "date", get: (a) => a.createdAt },
  ], [t]);
  const colFlt = useDataFilter(COLS, "adm-admins");

  const filtered = rankItems(colFlt.apply(admins), search, {
    texts: (a) => [a.fullName, a.username],
  });

  /* ⚠ O'ZINI tanish ID bo'yicha, foydalanuvchi nomi bo'yicha EMAS: nom
     katta-kichik harfda boshqacha yozilishi mumkin va tekshiruv jimgina
     o'tib ketardi. Serverda ham xuddi shunday. */
  const isSelf = (a) => user?.id != null && a.id === user.id;

  const toggleEnabled = async (a) => {
    const ok = await confirm({
      title:   t(a.enabled ? "adm.admins.blockTitle" : "adm.admins.unblockTitle"),
      message: t(a.enabled ? "adm.admins.blockMsg"   : "adm.admins.unblockMsg", { name: a.fullName }),
      type:    a.enabled ? "warning" : "info",
      confirmText: t(a.enabled ? "adm.admins.block" : "adm.admins.activate"),
    });
    if (!ok) return;
    try {
      await adminApi.setEnabled(a.id, !a.enabled);
      toast.success(t(a.enabled ? "adm.admins.blocked" : "adm.admins.activated"));
      load();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (a) => {
    const ok = await confirm({
      title: t("adm.admins.deleteTitle"),
      message: t("adm.admins.deleteMsg", { name: a.fullName }),
      type: "danger",
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    try { await adminApi.delete(a.id); toast.success(t("adm.admins.deleted")); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <span className="c-title">
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
            {t("adm.admins.title")}
          </span>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <Search value={search} onChange={setSearch}
                    placeholder={t("adm.admins.searchPlaceholder")} style={{ width:220 }} />
            <DataFilter cols={COLS} flt={colFlt} />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ type:"add" })}>
              <i className="fa-solid fa-plus" /> {t("adm.admins.add")}
            </button>
          </div>
        </div>

        {/* ⚠ Bo'lim nima uchun borligini bir qatorda aytadi. Ruxsat
            tizimi ko'rinmas narsa: uni tushuntirmasa, panelni ochgan
            odam nima uchun ba'zi adminlarda kamroq bo'lim borligini
            bilmaydi. */}
        <div className="ek-note" style={{ margin:"0 14px 10px", fontSize:12, color:"var(--fg-secondary)" }}>
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> {t("adm.admins.hint")}
        </div>

        <div className="tw">
          {busy ? <SkeletonTable rows={5} cols={["wide","text","text","narrow","text","narrow"]} /> : (
            <table>
              <thead>
                <tr>
                  <SortTh flt={colFlt} col="name">{t("adm.admins.colAdmin")}</SortTh>
                  <SortTh flt={colFlt} col="role">{t("adm.admins.colRole")}</SortTh>
                  <SortTh flt={colFlt} col="st">{t("common.status")}</SortTh>
                  <SortTh flt={colFlt} col="perms" className="num">{t("adm.admins.colPerms")}</SortTh>
                  <SortTh flt={colFlt} col="fa">{t("adm.admins.col2fa")}</SortTh>
                  <SortTh flt={colFlt} col="made">{t("common.date")}</SortTh>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar name={a.fullName} size={30} radius={8} />
                        <div style={{ display:"flex", flexDirection:"column" }}>
                          <span style={{ fontWeight:700 }}>
                            {a.fullName}
                            {isSelf(a) && (
                              <span style={{ fontSize:10, marginInlineStart:6, color:"var(--fg-secondary)" }}>
                                ({t("adm.admins.you")})
                              </span>
                            )}
                          </span>
                          <span className="ek-num" style={{ fontSize:11, color:"var(--fg-secondary)" }}>
                            {a.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td><Badge color={ADMIN_ROLE_LABELS[a.role]?.tone === "danger" ? "red" : "blue"}>
                      {adminRole(a.role).label}
                    </Badge></td>
                    <td>
                      <Badge color={a.enabled ? "green" : "red"}>
                        {t(a.enabled ? "common.active" : "common.blocked")}
                      </Badge>
                    </td>
                    <td className="num ek-num">{a.permissions?.length ?? 0}</td>
                    <td>
                      {/* 2FA — sir emas, HOLAT. Bosh admin "bu hisob
                          himoyalanganmi?" degan savolga javob olishi kerak. */}
                      {a.totpEnabled
                        ? <Badge color="green">{t("adm.admins.twoFaOn")}</Badge>
                        : <span style={{ fontSize:11, color:"var(--fg-secondary)" }}>{t("adm.admins.twoFaOff")}</span>}
                    </td>
                    <td className="ek-num" style={{ fontSize:12, color:"var(--fg-tertiary)" }}>
                      {a.createdAt ? fmtDate(a.createdAt) : "—"}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:5 }}>
                        <button className="bic b-blue" title={t("adm.admins.perms")}
                                onClick={() => setModal({ type:"perms", admin:a })}>
                          <i className="fa-solid fa-key" />
                        </button>
                        <button className="bic b-blue" title={t("common.edit")}
                                onClick={() => setModal({ type:"edit", admin:a })}>
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button className="bic b-yellow" title={t("adm.admins.password")}
                                onClick={() => setModal({ type:"password", admin:a })}>
                          <i className="fa-solid fa-lock" />
                        </button>
                        {/* ⚠ O'ZIGA nisbatan xavfli amallar UMUMAN
                            chizilmaydi. Server ham to'sadi, lekin
                            o'chirilgan tugmani ko'rsatish "nega
                            ishlamayapti?" degan savol tug'dirardi. */}
                        {!isSelf(a) && (
                          <>
                            <button className={`bic ${a.enabled ? "b-yellow" : "b-green"}`}
                                    title={t(a.enabled ? "adm.admins.block" : "adm.admins.activate")}
                                    onClick={() => toggleEnabled(a)}>
                              <i className={`fa-solid ${a.enabled ? "fa-ban" : "fa-check"}`} />
                            </button>
                            <button className="bic b-red" title={t("common.delete")}
                                    onClick={() => remove(a)}>
                              <i className="fa-solid fa-trash" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}>
                    <Empty icon="fa-user-shield" title={t("adm.admins.notFound")} />
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal?.type === "add" && (
        <AdminFormModal onClose={() => setModal(null)}
                        onSaved={() => { setModal(null); load(); }} toast={toast} />
      )}
      {modal?.type === "edit" && (
        <AdminFormModal admin={modal.admin} onClose={() => setModal(null)}
                        onSaved={() => { setModal(null); load(); }} toast={toast} />
      )}
      {modal?.type === "password" && (
        <PasswordModal admin={modal.admin} onClose={() => setModal(null)}
                       onSaved={() => setModal(null)} toast={toast} />
      )}
      {modal?.type === "perms" && (
        <PermissionsModal admin={modal.admin} catalog={perms} self={isSelf(modal.admin)}
                          onClose={() => setModal(null)} onChanged={load} toast={toast} />
      )}
    </div>
  );
}

/* ── Yangi admin / tahrirlash ──────────────────────────────────────────── */
function AdminFormModal({ admin, onClose, onSaved, toast }) {
  const { t } = useT();
  const editing = !!admin;
  const [form, setForm] = useState({
    fullName: admin?.fullName || "",
    username: admin?.username || "",
    password: "",
    role:     admin?.role     || "SUPPORT_ADMIN",
    email:    admin?.email    || "",
    /* ⚠ Niqob shakliga keltiriladi. Eski hisoblarda raqam bo'sh
       qoidada saqlangan («+998 90 …», hatto boshqa mamlakat kodi bilan)
       va maydonga tegilmasa o'sha ko'rinishda qaytib ketardi — server
       endi uni rad etadi. */
    phone:    phoneInput(admin?.phone || "").raw,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName.trim() || (!editing && !form.username.trim())) {
      toast.error(t("adm.admins.nameRequired")); return;
    }
    if (!editing && form.password.length < 10) {
      toast.error(t("adm.admins.passwordShort")); return;
    }
    setSaving(true);
    try {
      if (editing) {
        /* ⚠ `username` YUBORILMAYDI va serverda ham qabul qilinmaydi:
           u audit jurnalida aktyor sifatida yozilgan. Nomni
           almashtirish eski yozuvlarni egasiz qoldirardi. */
        await adminApi.update(admin.id, {
          fullName: form.fullName, role: form.role,
          email: form.email, phone: form.phone,
        });
        toast.success(t("adm.admins.updated"));
      } else {
        await adminApi.create(form);
        toast.success(t("adm.admins.created"));
      }
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t(editing ? "adm.admins.editTitle" : "adm.admins.createTitle",
                    { name: admin?.fullName })}
           onClose={onClose}
           footer={
             <><button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
               <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                 {saving ? <><Spinner /> {t("common.saving")}</>
                         : <><i className="fa-solid fa-check" /> {t("common.save")}</>}
               </button></>
           }>
      <FG label={`${t("adm.admins.fieldName")} *`}>
        <NameField className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
      </FG>

      {!editing && (
        <>
          <FG label={`${t("adm.admins.fieldUsername")} *`} hint={t("adm.admins.usernameHint")}>
            <UsernameField className="fi ek-num" value={form.username} onChange={set("username")} />
          </FG>
          {/* ⚠ Eng kami 10 belgi — do'kon xodimining parolidan uzunroq va
              bu ataylab: bu hisob BUTUN TIZIMGA tegadi. */}
          <FG label={`${t("adm.admins.fieldPassword")} *`} hint={t("adm.admins.passwordHint")}>
            <input className="fi" type="password" autoComplete="new-password"
                   value={form.password} onChange={set("password")} />
          </FG>
        </>
      )}

      {/* ══ ROL — BOSH ADMIN RO'YXATDA YO'Q ═══════════════════════════
          ⚠ SABAB TENGLIKDA. Ikki bosh admin bir-biriga nisbatan hech
          qanday himoyaga ega emas: har biri ikkinchisini bloklashi,
          o'chirishi va parolini almashtirishi mumkin. Nizo chiqsa kim
          tezroq bosgani yutadi. «O'zini o'chira olmaydi» qoidasi bu
          yerda yordam bermaydi — u faqat O'ZIGA nisbatan ishlaydi.

          ⚠ Vakolat berish yo'li yopilmagan: «Tizim admini» yaratib,
          unga kerakli ruxsatlarni bittalab ochish mumkin. Farqi
          shundaki, u boshqa adminlarga tegmaydi.

          ⚠ Server ham to'sadi (`assertNotSuperAdminRole`) — bu yerdagi
          filtr faqat ko'rinish uchun. */}
      <FG label={t("adm.admins.fieldRole")} hint={t("adm.admins.roleHint")}>
        {editing && admin.role === "SUPER_ADMIN" ? (
          /* Mavjud bosh adminni tahrirlash mumkin, faqat roli
             o'zgarmaydi — shuning uchun tanlagich o'rniga matn. */
          <input className="fi" readOnly value={adminRole(admin.role).label}
                 style={{ background:"var(--bg-sunken)", color:"var(--fg-secondary)", cursor:"not-allowed" }} />
        ) : (
          <Select block variant="field" ariaLabel={t("adm.admins.fieldRole")}
                  value={form.role}
                  onChange={(v) => set("role")({ target: { value: v } })}
                  options={Object.keys(ADMIN_ROLE_LABELS)
                    .filter((k) => k !== "SUPER_ADMIN")
                    .map((k) => ({
                      value: k, label: adminRole(k).label, icon: "fa-user-shield",
                    }))} />
        )}
      </FG>

      <div className="g2">
        {/* ⚠ Pochta — parolni tiklashning YAGONA kanali. Bo'sh
            qoldirilgan hisobda «parolni unutdim» ishlamaydi va buni
            foydalanuvchiga aytib ham bo'lmaydi. */}
        <FG label={t("common.email")} hint={t("adm.admins.emailHint")}>
          <EmailField className="fi" value={form.email} onChange={set("email")} />
        </FG>
        <FG label={t("common.phone")}>
          <PhoneField className="fi ek-num" value={form.phone} onChange={set("phone")} />
        </FG>
      </div>
    </Modal>
  );
}

/* ── Parolni almashtirish ──────────────────────────────────────────────── */
function PasswordModal({ admin, onClose, onSaved, toast }) {
  const { t } = useT();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (value.length < 10) { toast.error(t("adm.admins.passwordShort")); return; }
    setSaving(true);
    try {
      await adminApi.changePass(admin.id, value);
      toast.success(t("adm.admins.passwordChanged"));
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t("adm.admins.passwordTitle", { name: admin.fullName })} onClose={onClose}
           footer={
             <><button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
               <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                 {saving ? <><Spinner /> {t("common.saving")}</>
                         : <><i className="fa-solid fa-lock" /> {t("common.save")}</>}
               </button></>
           }>
      <FG label={t("adm.admins.fieldPassword")} hint={t("adm.admins.passwordHint")}>
        <input className="fi" type="password" autoComplete="new-password" autoFocus
               value={value} onChange={(e) => setValue(e.target.value)} />
      </FG>
      {/* ⚠ Bu oqibat foydalanuvchiga OLDINDAN aytiladi: parol
          almashgach o'sha hisobning barcha sessiyalari uziladi. */}
      <div style={{ fontSize:12, color:"var(--fg-secondary)", marginTop:8 }}>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t("adm.admins.passwordWarn")}
      </div>
    </Modal>
  );
}

/* ── Ruxsatlar matritsasi ──────────────────────────────────────────────── */
function PermissionsModal({ admin, catalog, self, onClose, onChanged, toast }) {
  const { t } = useT();
  const [row,   setRow]   = useState(admin);
  const [busyP, setBusyP] = useState(null);

  const effective = new Set(row.permissions || []);
  const baseline  = new Set(row.roleDefaults || []);
  const overrides = Object.fromEntries((row.overrides || []).map((o) => [o.permission, o]));

  const apply = async (permission, allowed) => {
    setBusyP(permission);
    try {
      const res = await adminApi.setPermission(admin.id, permission, allowed);
      setRow(res.data || row);
      onChanged?.();
    } catch (e) { toast.error(e.message); }
    finally { setBusyP(null); }
  };

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: catalog.filter((c) => groupOf(c.permission) === g),
  })).filter((g) => g.items.length);

  return (
    <Modal size="md" title={t("adm.admins.permsTitle", { name: admin.fullName })} onClose={onClose}
           footer={<button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.close")}</button>}>

      {/* ⚠ Rol tayanchi bilan qo'lda qo'yilgan qaror EKRANDA
          AJRATILADI. Aks holda "nega bu odamda bu bor?" degan savol
          javobsiz qolardi: bir xil roldagi ikki admin endi boshqa-boshqa
          imkoniyatga ega bo'lishi mumkin. */}
      <div style={{ fontSize:12, color:"var(--fg-secondary)", marginBottom:10 }}>
        <i className="fa-solid fa-circle-info" aria-hidden="true" />{" "}
        {t("adm.admins.permsHint", { role: adminRole(row.role).label })}
      </div>

      {self && (
        <div style={{ fontSize:12, color:"var(--fg-warning)", marginBottom:10 }}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t("adm.admins.permsSelf")}
        </div>
      )}

      {grouped.map((g) => (
        <div key={g.key} style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                        color:"var(--fg-tertiary)", marginBottom:6 }}>
            <i className={`fa-solid ${g.icon}`} aria-hidden="true" /> {t(g.key)}
          </div>

          {g.items.map(({ permission, grantable }) => {
            const on       = effective.has(permission);
            const fromRole = baseline.has(permission);
            const ov       = overrides[permission];
            const locked   = !grantable || self;

            return (
              <div key={permission}
                   style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0",
                            borderBottom:"1px solid var(--border-subtle)" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{t(`adm.perm.${permission}`)}</div>
                  <div style={{ fontSize:11, color:"var(--fg-tertiary)" }}>
                    {ov
                      ? t(ov.allowed ? "adm.admins.srcGranted" : "adm.admins.srcRevoked",
                          { by: ov.grantedBy || "—" })
                      : t(fromRole ? "adm.admins.srcRole" : "adm.admins.srcNone")}
                  </div>
                </div>

                <Badge color={on ? "green" : "gray"}>
                  {t(on ? "adm.admins.permOn" : "adm.admins.permOff")}
                </Badge>

                {/* ⚠ Berib bo'lmaydigan ruxsat (ADMIN_*) o'chirilgan
                    holda KO'RSATILADI, yashirilmaydi: yashirilsa "nega
                    bosh adminda ko'proq narsa bor?" degan savol
                    javobsiz qolardi. */}
                {locked ? (
                  <span style={{ fontSize:11, color:"var(--fg-tertiary)", whiteSpace:"nowrap" }}>
                    <i className="fa-solid fa-lock" aria-hidden="true" />{" "}
                    {t(self ? "adm.admins.lockedSelf" : "adm.admins.lockedGrant")}
                  </span>
                ) : (
                  <div style={{ display:"flex", gap:4 }}>
                    <button className={`btn btn-sm ${on ? "btn-outline" : "btn-primary"}`}
                            disabled={busyP === permission}
                            onClick={() => apply(permission, !on)}>
                      {busyP === permission ? <Spinner />
                        : t(on ? "adm.admins.revoke" : "adm.admins.grant")}
                    </button>
                    {/* Qarorni olib tashlash — rol tayanchiga qaytish.
                        Faqat qaror QO'YILGAN bo'lsa ma'noli. */}
                    {ov && (
                      <button className="btn btn-outline btn-sm" title={t("adm.admins.resetHint")}
                              disabled={busyP === permission}
                              onClick={() => apply(permission, null)}>
                        <i className="fa-solid fa-rotate-left" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </Modal>
  );
}
