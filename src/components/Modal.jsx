import { t } from "../lib/ek-i18n";

export default function Modal({ title, onClose, children, footer, size = "sm" }) {
  return (
    <div className="ov" onClick={onClose}>
      <div
        className={`mb ${size === "md" ? "md" : size === "lg" ? "lg" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mh">
          <span className="mt">{title}</span>
          <button className="bic" onClick={onClose} aria-label={t("common.close")}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="mbody">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}
