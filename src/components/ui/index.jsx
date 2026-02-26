import { initials } from "../../utils";

// ── Loader ────────────────────────────────────────────────────
export function Loader() {
  return (
    <div className="loader">
      <div className="spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ icon = "fa-inbox", title = "Ma'lumot yo'q", subtitle }) {
  return (
    <div className="empty">
      <i className={`fa-solid ${icon}`} />
      <div className="e-ttl">{title}</div>
      {subtitle && <div className="e-sub">{subtitle}</div>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, color = "blue" }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ name = "", size = 34, radius = 10 }) {
  return (
    <div
      className="av"
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  );
}

// ── Form Group ────────────────────────────────────────────────
export function FG({ label, hint, children, half }) {
  return (
    <div className="fg" style={half ? { gridColumn: "span 1" } : {}}>
      <label className="flb">{label}</label>
      {children}
      {hint && <div className="fhint">{hint}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, icon, bg, color, change, up = true }) {
  return (
    <div className="sc">
      <div className="sc-icon" style={{ background: bg, color }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="sc-val">{value}</div>
        <div className="sc-lbl">{label}</div>
        {change && (
          <div className={`sc-chg ${up ? "sc-up" : "sc-down"}`}>
            <i className={`fa-solid fa-caret-${up ? "up" : "down"}`} /> {change}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────
export function Search({ value, onChange, placeholder = "Qidirish...", style }) {
  return (
    <div className="srch" style={style}>
      <i className="fa-solid fa-magnifying-glass" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text3)", fontSize: 13, padding: 0 }}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
}

// ── Info Item (detail cardlarda) ──────────────────────────────
export function II({ label, value }) {
  return (
    <div className="ii">
      <div className="ii-lbl">{label}</div>
      <div className="ii-val">{value ?? "—"}</div>
    </div>
  );
}

// ── Confirm delete ────────────────────────────────────────────
export const confirmOk = (msg) => window.confirm(msg || "Tasdiqlaysizmi?");
