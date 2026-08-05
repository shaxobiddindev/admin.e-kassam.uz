import { useState, useEffect } from "react";
import { LOGO_URL, LOGO_DARK_URL, MARK_URL, initials, ADMIN_ROLE_LABELS } from "../utils";
import { useConfirm } from "../context/ConfirmProvider";
import { useT } from "../lib/ek-i18n";

/* Yon menyu tuzilishi — YORLIQ EMAS, KALIT saqlanadi. Yorliq har render'da
   `t()` dan olinadi, aks holda til almashtirilganda menyu eski tilda qolardi. */
const NAV = [
  { sec: "nav.section.main", items: [
    { id: "dashboard", key: "nav.dashboard", icon: "fa-chart-pie" },
    // Arizalar — Dashboard'dan keyin darhol: landingdan kelgan lid
    // javobsiz qolmasligi kerak, bu bo'lim ko'zga birinchi tushsin.
    { id: "requests",  key: "nav.requests",  icon: "fa-inbox" },
  ]},
  { sec: "nav.section.system", items: [
    { id: "shops",     key: "nav.shops",     icon: "fa-store"        },
    { id: "users",     key: "nav.users",     icon: "fa-users"        },
    { id: "customers", key: "nav.customers", icon: "fa-address-book" },
  ]},
  { sec: "nav.section.settings", items: [
    { id: "settings",  key: "nav.settings",  icon: "fa-gear" },
  ]},
];

const ICONS = {
  dashboard: "fa-chart-pie",
  requests:  "fa-inbox",
  shops:     "fa-store",
  users:     "fa-users",
  customers: "fa-address-book",
  settings:  "fa-gear",
};
const TITLE_KEYS = {
  dashboard: "nav.dashboard",
  requests:  "nav.requests",
  shops:     "nav.shops",
  users:     "nav.users",
  customers: "nav.customers",
  settings:  "nav.settings",
};

function Sidebar({ page, setPage, user, onLogout, open, onClose, isCollapsed, onToggleCollapse }) {
  const { t } = useT();
  const roleInfo = ADMIN_ROLE_LABELS[user?.role];
  const roleLabel = roleInfo?.label || t("enum.adminRole.SUPER_ADMIN");

  return (
    <aside className={`sb ${open ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sb-brand">
        <div className="sb-logo-wrap">
          {isCollapsed ? (
            <img src={MARK_URL} alt="e-Kassam" />
          ) : (
            <>
              <img className="logo--light" src={LOGO_URL} alt="e-Kassam" />
              <img className="logo--dark" src={LOGO_DARK_URL} alt="" aria-hidden="true" />
            </>
          )}
        </div>
      </div>

      <button className="sb-toggle" onClick={onToggleCollapse}
              aria-label={t("layout.menu")}>
        <i className={`fa-solid ${isCollapsed ? "fa-chevron-right" : "fa-chevron-left"}`} />
      </button>

      <nav className="sb-nav">
        {NAV.map((group) => (
          <div key={group.sec}>
            <div className="sb-sec">{t(group.sec)}</div>
            {group.items.map((item) => {
              const label = t(item.key);
              return (
                /* Bosiladigan element — TUGMA, `<div>` emas: klaviatura bilan
                   yetib boriladi va ekran o'quvchi uni bosiladigan deb o'qiydi. */
                <button
                  key={item.id}
                  type="button"
                  className={`sb-item ${page === item.id ? "on" : ""}`}
                  onClick={() => { setPage(item.id); onClose(); }}
                  title={isCollapsed ? label : ""}
                  aria-current={page === item.id ? "page" : undefined}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — tema tanlagichi bu yerdan OLIB TASHLANDI: barcha sozlamalar
          endi «Sozlamalar» sahifasida turadi (bitta joy, bitta qidiruv). */}
      <div className="sb-foot">
        <div className="sb-user" onClick={onLogout} title={isCollapsed ? t("layout.logout") : ""}
             role="button" tabIndex={0}
             onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onLogout(); } }}>
          <div className="av" style={{ width: isCollapsed ? 28 : 34, height: isCollapsed ? 28 : 34, borderRadius:9, fontSize:13 }}>
            {initials(user?.fullName || user?.username)}
          </div>
          <div className="sb-u-info" style={{ flex:1, minWidth:0 }}>
            <div className="sb-u-name">{user?.fullName || user?.username}</div>
            <div className="sb-u-role">
              {roleLabel}
              <i className="fa-solid fa-right-from-bracket" style={{ marginLeft:5 }} aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Layout({ page, setPage, user, onLogout, children }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("adm_sb_collapsed") === "1");

  useEffect(() => {
    localStorage.setItem("adm_sb_collapsed", isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  // Sozlamalar sahifasidan yig'ish holati o'zgarsa, menyu ham ergashsin
  useEffect(() => {
    const sync = () => setIsCollapsed(localStorage.getItem("adm_sb_collapsed") === "1");
    window.addEventListener("ek:sidebar", sync);
    return () => window.removeEventListener("ek:sidebar", sync);
  }, []);

  const handleLogout = async () => {
    const ok = await confirm({
      title: t("layout.logout"),
      message: t("layout.logoutConfirm"),
      type: "warning",
      confirmText: t("layout.logout"),
      cancelText: t("common.cancel"),
    });
    if (ok) onLogout();
  };

  const titleKey  = TITLE_KEYS[page] || TITLE_KEYS.dashboard;
  const titleIcon = ICONS[page] || ICONS.dashboard;

  return (
    <div className={`app ${isCollapsed ? "collapsed" : ""}`}>
      {/* Overlay — mobil va sidebar ochiq bo'lganda */}
      {open && (
        <div className="ek-overlay" onClick={() => setOpen(false)}
          style={{ position:"fixed", inset:0, background:"var(--scrim)", zIndex:200 }} />
      )}

      <Sidebar
        page={page} setPage={setPage} user={user} onLogout={handleLogout}
        open={open} onClose={() => setOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* .main — margin-left: var(--sw), kichik ekranda 0 */}
      <div className="main">
        <div className="topbar">
          {/* Hamburger — faqat kichik ekranda ko'rinadi (CSS bilan) */}
          <button className="bic ham-btn" onClick={() => setOpen(v => !v)}
                  aria-label={t("layout.menu")} aria-expanded={open}>
            <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"}`} aria-hidden="true" />
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <i className={`fa-solid ${titleIcon}`} style={{ color:"var(--fg-brand)", fontSize:16 }} aria-hidden="true" />
            <span style={{ fontWeight:900, fontSize:16 }}>{t(titleKey)}</span>
          </div>

          {/* 07-ADMIN.md — superadmin bo'limi qizil urg'u oladi: foydalanuvchi
              qayerda ekanini adashtirmasin. */}
          <div className="tb-badge" style={{ marginLeft:"auto" }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight:5 }} aria-hidden="true" />
            {t("layout.superadmin")}
          </div>
        </div>

        {/* Sahifa o'tishi — faqat opacity, 140ms */}
        <div className="page ek-page-in" key={page}>{children}</div>
      </div>
    </div>
  );
}
