import { useState } from "react";
import { useT } from "../lib/ek-i18n";
import { ADMIN_ROLE_LABELS } from "../utils";
import ThemeSelect from "../components/ek/ThemeSelect";
import LangSelect from "../components/ek/LangSelect";
import { useConfirm } from "../context/ConfirmProvider";
import TwoFactorCard from "../components/TwoFactorCard";

/* ══════════════════════════════════════════════════════════════════════════
   Sozlamalar — BARCHA sozlamalar uchun YAGONA joy.

   Ilgari tema tanlagichi yon menyu tagida turardi va til umuman yo'q edi.
   Sozlama qayerda ekanini topish uchun foydalanuvchi menyuni qidirishi kerak
   emas: bitta bo'lim, bitta ekran.

   ⚠ Til FAQAT INTERFEYSGA ta'sir qiladi. Do'kon nomi, mijoz ismi, tovar nomi
   — bularning hammasi bazadagi ma'lumot va tarjima qilinmaydi.
   ══════════════════════════════════════════════════════════════════════════ */

/** Bitta sozlama qatori: chapda nom + izoh, o'ngda boshqaruv. */
function Row({ label, hint, children }) {
  return (
    <div className="set-row">
      <div className="set-row__text">
        <div className="set-row__label">{label}</div>
        {hint && <div className="set-row__hint">{hint}</div>}
      </div>
      <div className="set-row__control">{children}</div>
    </div>
  );
}

function Section({ icon, title, hint, children }) {
  return (
    <div className="card set-card">
      <div className="c-head">
        <span className="c-title">
          <i className={`fa-solid ${icon}`} aria-hidden="true" /> {title}
        </span>
      </div>
      {hint && <p className="set-card__hint">{hint}</p>}
      <div className="set-list">{children}</div>
    </div>
  );
}

export default function SettingsPage({ user, onLogout, toast }) {
  const { t } = useT();
  const confirm = useConfirm();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("adm_sb_collapsed") === "1"
  );

  const toggleCollapsed = (next) => {
    setCollapsed(next);
    localStorage.setItem("adm_sb_collapsed", next ? "1" : "0");
    // Layout localStorage'ni kuzatmaydi — o'zgarishni hodisa bilan aytamiz.
    window.dispatchEvent(new Event("ek:sidebar"));
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: t("layout.logout"),
      message: t("layout.logoutConfirm"),
      type: "warning",
      confirmText: t("layout.logout"),
      cancelText: t("common.cancel"),
    });
    if (ok) onLogout?.();
  };

  const roleLabel =
    ADMIN_ROLE_LABELS[user?.role]?.label || t("enum.adminRole.SUPER_ADMIN");

  return (
    <div className="set-page">
      <Section
        icon="fa-palette"
        title={t("settings.appearance")}
        hint={t("settings.appearanceHint")}
      >
        <Row label={t("settings.theme")} hint={t("settings.themeHint")}>
          <ThemeSelect />
        </Row>
        <Row label={t("settings.language")} hint={t("settings.languageHint")}>
          <LangSelect />
        </Row>
      </Section>

      <Section icon="fa-sliders" title={t("settings.interface")}>
        <Row label={t("settings.sidebarCollapsed")} hint={t("settings.sidebarHint")}>
          {/* Ikki holatli — bu yerda tugma to'g'ri (temadan farqli: holat ikkita) */}
          <button
            type="button"
            role="switch"
            aria-checked={collapsed}
            className={`ek-switch ${collapsed ? "on" : ""}`}
            onClick={() => toggleCollapsed(!collapsed)}
          >
            <span className="ek-switch__knob" />
            <span className="ek-switch__text">
              {collapsed ? t("common.yes") : t("common.no")}
            </span>
          </button>
        </Row>
      </Section>

      <Section
        icon="fa-user-shield"
        title={t("settings.account")}
        hint={t("settings.accountHint")}
      >
        <Row label={t("common.fullName")}>
          <span className="set-value">{user?.fullName || "—"}</span>
        </Row>
        <Row label={t("common.username")}>
          <span className="set-value ek-num">@{user?.username || "—"}</span>
        </Row>
        <Row label={t("common.role")}>
          <span className="set-value">{roleLabel}</span>
        </Row>
        <Row label={t("settings.session")}>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            {t("settings.logoutAll")}
          </button>
        </Row>
      </Section>

      {/* Ikki bosqichli kirish — hisob bo'limidan KEYIN: u ham shu
          hisobning xavfsizligi haqida, lekin alohida kartochka bo'lishi
          kerak (ichida ko'p qadamli oqim bor). */}
      <TwoFactorCard toast={toast} />

      <Section icon="fa-circle-info" title={t("settings.about")}>
        <Row label="e-Kassam">
          <span className="set-value ek-num">admin.e-kassam.uz</span>
        </Row>
      </Section>
    </div>
  );
}
