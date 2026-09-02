import { createPortal } from "react-dom";
import { t } from "../lib/ek-i18n";

/**
 * ⚠ OYNA `document.body` GA CHIZILADI (portal), sahifa ichiga EMAS.
 *
 * Sabab — haqiqiy xato (foydalanuvchi shikoyati: «modal katta bo'lsa
 * header tagiga kirib qolyapti»). Oyna sahifa daraxti ichida chizilganda
 * uning `z-index: 500` i eng yaqin «stacking context» ICHIDA hisoblanadi.
 * `.page` esa kirish animatsiyasi tufayli aynan shunday quticha ochib
 * qo'yardi va tashqaridagi `.topbar` (z-index 100) oynadan YUQORIDA
 * chizilardi.
 *
 * Animatsiya tuzatildi (`ek-motion.css` §15), lekin oynaning to'g'ri
 * ishlashi kelajakdagi har qanday `transform`/`filter`/`opacity` ga
 * BOG'LIQ BO'LMASLIGI kerak: bugun tuzatilgan narsa ertaga boshqa
 * sahifada qaytadan buzilishi mumkin va buni yana faqat foydalanuvchi
 * topardi. Portal bu bog'liqlikni butunlay uzadi.
 */
export default function Modal({ title, onClose, children, footer, size = "sm" }) {
  return createPortal(
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
    </div>,
    document.body
  );
}
