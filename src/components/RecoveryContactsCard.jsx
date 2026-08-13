import { useEffect, useState } from "react";
import { useT } from "../lib/ek-i18n";
import { adminProfileApi } from "../api";

/* ══════════════════════════════════════════════════════════════════════════
   Tiklash aloqalari — pochta va telefon.

   ⚠ Bu «profil» emas, KALIT: pochta orqali parolni tiklash mumkin.
   Shuning uchun o'zgartirish jurnalga tushadi va ESKI manzilga
   ogohlantirish yuboriladi (server tomonda).

   ⚠ Manzilsiz hisobda «parolni unutdim» ISHLAMAYDI: xat yuboradigan
   joy yo'q. Ekran buni ochiq aytadi — aks holda foydalanuvchi funksiya
   bor deb o'ylab, kerak bo'lgan kunda hisobidan qulflanib qolardi.

   Telefon hozircha faqat SAQLANADI: SMS provayderi tanlanmagan (§10z).
   Buni ham yashirmasdan aytamiz.
   ══════════════════════════════════════════════════════════════════════════ */

export default function RecoveryContactsCard({ toast }) {
  const { t } = useT();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => adminProfileApi.get()
    .then((r) => {
      setData(r.data || {});
      setEmail(r.data?.email || "");
      setPhone(r.data?.phone || "");
    })
    .catch((e) => toast?.error?.(e.message));

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const r = await adminProfileApi.update({ email: email.trim() || null, phone: phone.trim() || null });
      setData(r.data || {});
      toast?.success?.(r.message || t("common.saved"));
    } catch (e) {
      toast?.error?.(e.message);
    } finally { setBusy(false); }
  };

  const dirty = data && ((data.email || "") !== email.trim() || (data.phone || "") !== phone.trim());
  const noEmail = data && !data.email;

  return (
    <div className="card set-card">
      <div className="c-head">
        <span className="c-title">
          <i className="fa-solid fa-life-ring" aria-hidden="true" /> {t("recovery.title")}
        </span>
      </div>
      <p className="set-card__hint">{t("recovery.hint")}</p>

      <div className="set-list">
        {/* Manzil yo'q bo'lsa — ochiq ogohlantirish, chunki bu holatda
            parolni tiklash umuman ishlamaydi. */}
        {noEmail && (
          <div className="set-row">
            <div className="set-row__text">
              <div className="set-row__label" style={{ color: "var(--fg-warning)" }}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t("recovery.noEmail")}
              </div>
              <div className="set-row__hint">{t("recovery.noEmailHint")}</div>
            </div>
          </div>
        )}

        <div className="set-row">
          <div className="set-row__text">
            <div className="set-row__label">{t("recovery.email")}</div>
            <div className="set-row__hint">{t("recovery.emailHint")}</div>
          </div>
          <div className="set-row__control">
            <input className="form-input" type="email" style={{ minWidth: 220 }}
                   value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="ega@example.com" autoComplete="email"
                   aria-label={t("recovery.email")} />
          </div>
        </div>

        <div className="set-row">
          <div className="set-row__text">
            <div className="set-row__label">{t("recovery.phone")}</div>
            {/* SMS hali ulanmagani ATAYLAB aytiladi: «raqam bor, demak
                SMS keladi» degan noto'g'ri kutish paydo bo'lmasin. */}
            <div className="set-row__hint">{t("recovery.phoneHint")}</div>
          </div>
          <div className="set-row__control">
            <input className="form-input ek-num" type="tel" style={{ minWidth: 220 }}
                   value={phone} onChange={(e) => setPhone(e.target.value)}
                   placeholder="+998901234567" autoComplete="tel"
                   aria-label={t("recovery.phone")} />
          </div>
        </div>

        <div className="set-row">
          <div className="set-row__text">
            <div className="set-row__hint">{t("recovery.changeWarn")}</div>
          </div>
          <div className="set-row__control">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty}>
              <i className="fa-solid fa-check" aria-hidden="true" /> {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
