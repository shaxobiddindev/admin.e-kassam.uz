import { useState, useEffect } from "react";
import { LOGO_URL, initials, ADMIN_ROLE_LABELS } from "../utils";

const NAV = [
  { sec: "Asosiy", items: [
    { id: "dashboard", label: "Dashboard",        icon: "fa-chart-pie"    },
  ]},
  { sec: "Tizim boshqaruvi", items: [
    { id: "shops",     label: "Do'konlar",        icon: "fa-store"        },
    { id: "users",     label: "Foydalanuvchilar", icon: "fa-users"        },
    { id: "customers", label: "Mijozlar",         icon: "fa-address-book" },
  ]},
];

const TITLES = {
  dashboard: { label: "Dashboard",        icon: "fa-chart-pie"    },
  shops:     { label: "Do'konlar",        icon: "fa-store"        },
  users:     { label: "Foydalanuvchilar", icon: "fa-users"        },
  customers: { label: "Mijozlar",         icon: "fa-address-book" },
};

function Sidebar({ page, setPage, user, onLogout, open, onClose, isCollapsed, onToggleCollapse }) {
  const roleInfo = ADMIN_ROLE_LABELS[user?.role] || { label: "Admin" };
  return (
    <aside className={`sb ${open ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sb-brand">
        <div className="sb-logo-wrap">
          <img src={isCollapsed ? "/favicon.png" : LOGO_URL} alt="e-Kassam"
            style={{ width:"100%", height:"100%", objectFit:"contain" }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }} />
          <div className="sb-logo-fallback">
            <i className="fa-solid fa-shield-halved" />
          </div>
        </div>
      </div>

      <button className="sb-toggle" onClick={onToggleCollapse}>
        <i className={`fa-solid ${isCollapsed ? "fa-chevron-right" : "fa-chevron-left"}`} />
      </button>

      <nav className="sb-nav">
        {NAV.map((group) => (
          <div key={group.sec}>
            <div className="sb-sec">{group.sec}</div>
            {group.items.map((item) => (
              <div key={item.id}
                className={`sb-item ${page === item.id ? "on" : ""}`}
                onClick={() => { setPage(item.id); onClose(); }}
                title={isCollapsed ? item.label : ""}>
                <i className={`fa-solid ${item.icon}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — CSS da sb-foot */}
      <div className="sb-foot">
        <div className="sb-user" onClick={onLogout} title={isCollapsed ? "Chiqish" : ""}>
          <div className="av" style={{ width: isCollapsed ? 28 : 34, height: isCollapsed ? 28 : 34, borderRadius:9, fontSize:13 }}>
            {initials(user?.fullName || user?.username)}
          </div>
          <div className="sb-u-info" style={{ flex:1, minWidth:0 }}>
            <div className="sb-u-name">{user?.fullName || user?.username}</div>
            <div className="sb-u-role">
              {roleInfo?.label || "Admin"}
              <i className="fa-solid fa-right-from-bracket" style={{ marginLeft:5 }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Layout({ page, setPage, user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("adm_sb_collapsed") === "1");

  useEffect(() => {
    localStorage.setItem("adm_sb_collapsed", isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  const title = TITLES[page] || TITLES.dashboard;

  return (
    <div className={`app ${isCollapsed ? "collapsed" : ""}`}>
      {/* Overlay — mobil va sidebar ochiq bo'lganda */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200 }} />
      )}

      <Sidebar 
        page={page} setPage={setPage} user={user} onLogout={onLogout}
        open={open} onClose={() => setOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* .main — margin-left: var(--sw), kichik ekranda 0 */}
      <div className="main">
        <div className="topbar">
          {/* Hamburger — faqat kichik ekranda ko'rinadi (CSS bilan) */}
          <button className="bic ham-btn" onClick={() => setOpen(v => !v)}>
            <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"}`} />
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <i className={`fa-solid ${title.icon}`} style={{ color:"var(--blue)", fontSize:16 }} />
            <span style={{ fontWeight:900, fontSize:16 }}>{title.label}</span>
          </div>

          <div style={{ marginLeft:"auto", background:"var(--blue-l)", color:"var(--blue-d)", fontSize:11, fontWeight:800, padding:"4px 11px", borderRadius:20 }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight:5 }} />
            SUPERADMIN
          </div>
        </div>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
