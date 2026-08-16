import { initials } from "../../utils";
import { t } from "../../lib/ek-i18n";

// ── Loader ────────────────────────────────────────────────────
export function Loader() {
  return (
    <div className="loader">
      <div className="spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ icon = "fa-inbox", title, subtitle, text }) {
  // `title` berilmasa umumiy matn; `text` — eski nom, mos-kelish uchun
  const heading = title ?? text ?? t("common.empty");
  return (
    <div className="empty">
      <i className={`fa-solid ${icon}`} />
      <div className="e-ttl">{heading}</div>
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
export function Search({ value, onChange, placeholder, style }) {
  return (
    <div className="srch" style={style}>
      <i className="fa-solid fa-magnifying-glass" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `${t("common.search")}…`}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label={t("common.reset")}
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--fg-tertiary)", fontSize: 13, padding: 0 }}
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

/* ⚠ Bu yerda `confirmOk = (msg) => window.confirm(msg)` turardi — o'chirildi.
   Tizimda tasdiq FAQAT modal orqali so'raladi: `useConfirm()`
   (`context/ConfirmProvider.jsx`). Brauzerning o'z oynasi temaga
   bo'ysunmaydi va sahifa nomi bilan begona sarlavha chiqaradi.
   Hech qayerda ishlatilmagan edi — lekin turgan joyida yana ishlatilardi. */
