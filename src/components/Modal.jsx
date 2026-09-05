import { useEffect, useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { t } from "../lib/ek-i18n";
import { pushLayer, popLayer, isTopLayer, subscribeLayers } from "../lib/modal-stack";

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
 *
 * ══ ORQA FONGA BOSISH YOPMAYDI, ESC YOPADI (V72) ═══════════════════
 *
 * Do'kon egasi: «barcha modal oynalarda bo'sh joyga tegganda yopilishni
 * olib tashlash kerak — bu behosdan tegishda foydali; ESC bilan yopilish
 * esa HAR BIR modal oynada bo'lishi shart».
 *
 * ⚠ Ilgari bu yerda `onClick={onClose}` turardi va ESC UMUMAN
 * ishlamasdi: ya'ni oyna tasodifiy teginishdan yopilardi, ataylab
 * yopmoqchi bo'lganda esa faqat ✕ ga tegish kerak edi. Endi teskarisi.
 *
 * ⚠ ESC FAQAT ENG USTIDAGI oynani yopadi (`modal-stack.js`) — ketma-ket
 * ochilgan ikkita oyna bitta bosishda yopilib ketmasin.
 */
export default function Modal({ title, onClose, children, footer, size = "sm" }) {
  const id = useId();

  useEffect(() => {
    pushLayer(id);
    return () => popLayer(id);
  }, [id]);

  const top = useSyncExternalStore(subscribeLayers, () => isTopLayer(id), () => true);

  useEffect(() => {
    if (!onClose || !top) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    /* `capture` — maydonlarning o'z Esc ishlovchisidan OLDIN ushlash
       uchun; `stopPropagation` esa pastdagi oynalarga yetib bormasligi
       uchun. */
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, top]);

  return createPortal(
    /* ⚠ `onClick` YO'Q — orqa fonga bosish yopmaydi (yuqoridagi izoh). */
    <div className="ov">
      <div className={`mb ${size === "md" ? "md" : size === "lg" ? "lg" : ""}`}>
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
