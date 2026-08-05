import { Link } from "react-router-dom";
import { useT } from "../lib/ek-i18n";

/* ══════════════════════════════════════════════════════════════════════════
   404 — panel ichida

   Marshrutlash qo'shilgach kerak bo'ldi: endi manzilni qo'lda yozish yoki
   eski havolani ochish mumkin. Bunday holatda Dashboard'ni JIMGINA
   ko'rsatish yomon — foydalanuvchi so'ragan sahifada ekanman deb o'ylaydi.

   Panelning ichki sahifasi bo'lgani uchun bu yerda alohida fon, animatsiya
   yoki avtomatik yo'naltirish YO'Q: yon menyu joyida turibdi, keyingi qadam
   allaqachon ko'z oldida.
   ══════════════════════════════════════════════════════════════════════════ */

export default function NotFound() {
  const { t } = useT();

  return (
    <div className="card" style={{ padding: 48, textAlign: "center" }}>
      <i className="fa-solid fa-map-signs"
         style={{ fontSize: 40, color: "var(--fg-tertiary)" }} aria-hidden="true" />

      <div className="ek-num" style={{ fontSize: 44, fontWeight: 900, margin: "12px 0 4px" }}>
        404
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
        {t("notFound.title")}
      </h2>
      <p style={{ color: "var(--fg-secondary)", marginBottom: 24 }}>
        {t("notFound.subtitle")}
      </p>

      <Link className="btn btn-primary" to="/">
        <i className="fa-solid fa-house" aria-hidden="true" /> {t("notFound.home")}
      </Link>
    </div>
  );
}
