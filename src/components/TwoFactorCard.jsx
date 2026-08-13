import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useT } from "../lib/ek-i18n";
import { twoFactorApi } from "../api";
import { useConfirm } from "../context/ConfirmProvider";

/* ══════════════════════════════════════════════════════════════════════════
   Ikki bosqichli kirish (2FA) — superadmin hisobi uchun.

   05-AUTH.md: «Superadmin uchun 2FA majburiy. Bu muzokara qilinmaydi.»
   Sabab: bu hisob BARCHA do'konlarni, ularning savdo tarixini va
   obunalarini boshqaradi.

   ⚠ IKKI QADAM: «Boshlash» sirni beradi, «Tasdiqlash» esa yoqadi. Bir
   qadamda yoqilsa, ilovaga sirni noto'g'ri kiritgan odam o'z hisobidan
   butunlay qulflanib qolardi — va superadmin hisobini ochadigan boshqa
   odam yo'q.

   ⚠ TIKLASH KODLARI BIR MARTA ko'rsatiladi. Ular parolga teng kuchli va
   bazada faqat xeshi turadi; qayta ko'rsatib bo'lmaydi. Shuning uchun
   ekranda bu ochiq aytiladi va nusxa olish tugmasi bor.
   ══════════════════════════════════════════════════════════════════════════ */

export default function TwoFactorCard({ toast }) {
  const { t } = useT();
  const confirm = useConfirm();

  const [status, setStatus] = useState(null);   // { enabled, recoveryCodesLeft, emailSet }
  const [setup, setSetup] = useState(null);     // { secret, otpAuthUri }
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);     // tiklash kodlari — bir marta
  const [busy, setBusy] = useState(false);
  const qrRef = useRef(null);

  /* QR — BRAUZERDA chiziladi, tashqi xizmatga so'rov yuborilmaydi.
     ⚠ Bu muhim: QR ichida 2FA SIRI turadi va uni «qulay» QR
     generatoriga yuborish sirni begona serverga berish demak. */
  useEffect(() => {
    if (!setup?.otpAuthUri || !qrRef.current) return;
    QRCode.toCanvas(qrRef.current, setup.otpAuthUri, {
      width: 190, margin: 1,
      // Qorong'i rejimda ham o'qilsin: QR skanerlari kontrastga tayanadi,
      // shuning uchun ranglar temaga qarab EMAS, doim qora/oq.
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => {});
  }, [setup]);

  const load = () => twoFactorApi.status()
    .then((r) => setStatus(r.data || null))
    .catch((e) => toast?.error?.(e.message));

  useEffect(() => { load(); }, []);

  const start = async () => {
    setBusy(true);
    try {
      const r = await twoFactorApi.setup();
      setSetup(r.data);
      setCode("");
    } catch (e) { toast?.error?.(e.message); } finally { setBusy(false); }
  };

  const confirmCode = async () => {
    setBusy(true);
    try {
      const r = await twoFactorApi.confirm(code.trim());
      setCodes(r.data || []);
      setSetup(null);
      setCode("");
      await load();
      toast?.success?.(r.message || t("twofa.enabled"));
    } catch (e) { toast?.error?.(e.message); } finally { setBusy(false); }
  };

  const disable = async () => {
    /* ⚠ O'chirish uchun ham kod so'raladi (server ham talab qiladi):
       o'g'irlangan sessiya bilan himoyani bir bosishda yechib
       tashlab bo'lmasin. */
    const ok = await confirm({
      title: t("twofa.disableTitle"),
      message: t("twofa.disableWarn"),
      type: "warning",
      confirmText: t("twofa.disable"),
      cancelText: t("common.cancel"),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await twoFactorApi.disable(code.trim());
      setCode("");
      await load();
      toast?.success?.(r.message || t("twofa.disabled"));
    } catch (e) { toast?.error?.(e.message); } finally { setBusy(false); }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast?.success?.(t("common.copied")))
      .catch(() => {});
  };

  const on = !!status?.enabled;

  return (
    <div className="card set-card">
      <div className="c-head">
        <span className="c-title">
          <i className="fa-solid fa-shield-halved" aria-hidden="true" /> {t("twofa.title")}
        </span>
        <span className={`badge ${on ? "badge-green" : "badge-yellow"}`}>
          {on ? t("twofa.on") : t("twofa.off")}
        </span>
      </div>
      <p className="set-card__hint">{t("twofa.hint")}</p>

      <div className="set-list">
        {/* Pochta biriktirilmagan bo'lsa — ogohlantirish. Telefon
            yo'qolganda xavfsizlik xabarlari o'sha manzilga boradi. */}
        {status && !status.emailSet && (
          <div className="set-row">
            <div className="set-row__text">
              <div className="set-row__label" style={{ color: "var(--fg-warning)" }}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t("twofa.noEmail")}
              </div>
              <div className="set-row__hint">{t("twofa.noEmailHint")}</div>
            </div>
          </div>
        )}

        {on && (
          <div className="set-row">
            <div className="set-row__text">
              <div className="set-row__label">{t("twofa.recoveryLeft")}</div>
              <div className="set-row__hint">{t("twofa.recoveryLeftHint")}</div>
            </div>
            <div className="set-row__control">
              <span className="set-value ek-num">{status.recoveryCodesLeft}</span>
            </div>
          </div>
        )}

        {/* ── 1-qadam: sirni olish ── */}
        {!on && !setup && (
          <div className="set-row">
            <div className="set-row__text">
              <div className="set-row__label">{t("twofa.startTitle")}</div>
              <div className="set-row__hint">{t("twofa.startHint")}</div>
            </div>
            <div className="set-row__control">
              <button className="btn btn-primary btn-sm" onClick={start} disabled={busy}>
                <i className="fa-solid fa-key" aria-hidden="true" /> {t("twofa.start")}
              </button>
            </div>
          </div>
        )}

        {/* ── 2-qadam: sirni ilovaga kiritib, kod bilan tasdiqlash ── */}
        {setup && (
          <div className="set-row" style={{ display: "block" }}>
            <div className="set-row__label">{t("twofa.secretTitle")}</div>
            <div className="set-row__hint" style={{ marginBottom: 10 }}>{t("twofa.secretHint")}</div>

            {/* QR — asosiy yo'l: skanerlash bir harakat, kalitni qo'lda
                terish esa 32 belgi. Pastdagi kalit MUQOBIL bo'lib qoladi:
                skaner ishlamasa yoki kamera yo'q bo'lsa kerak bo'ladi. */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
              <canvas ref={qrRef} width={190} height={190}
                      aria-label={t("twofa.qrAlt")} role="img"
                      style={{ background: "#fff", borderRadius: 10, padding: 8, flexShrink: 0 }} />
              <p className="set-row__hint" style={{ flex: "1 1 200px", margin: 0 }}>
                {t("twofa.qrHint")}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <code className="ek-num" style={{
                padding: "10px 12px", background: "var(--bg-sunken)",
                borderRadius: 8, letterSpacing: 2, wordBreak: "break-all", flex: "1 1 220px",
              }}>{setup.secret}</code>
              <button className="btn btn-outline btn-sm" onClick={() => copy(setup.secret)}>
                <i className="fa-solid fa-copy" aria-hidden="true" /> {t("common.copy")}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="fi ek-num" style={{ maxWidth: 160 }}
                value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="123456" inputMode="numeric" autoComplete="one-time-code"
                aria-label={t("twofa.codeLabel")}
              />
              <button className="btn btn-primary btn-sm" onClick={confirmCode}
                      disabled={busy || code.trim().length < 6}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {t("twofa.confirm")}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setSetup(null)} disabled={busy}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* ── Tiklash kodlari — BIR MARTA ── */}
        {codes && (
          <div className="set-row" style={{ display: "block" }}>
            <div className="set-row__label" style={{ color: "var(--fg-danger)" }}>
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {t("twofa.codesTitle")}
            </div>
            <div className="set-row__hint" style={{ marginBottom: 10 }}>{t("twofa.codesHint")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {codes.map((c) => (
                <code key={c} className="ek-num" style={{
                  padding: "8px 10px", background: "var(--bg-sunken)", borderRadius: 8, textAlign: "center",
                }}>{c}</code>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-outline btn-sm" onClick={() => copy(codes.join("\n"))}>
                <i className="fa-solid fa-copy" aria-hidden="true" /> {t("common.copy")}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setCodes(null)}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {t("twofa.codesSaved")}
              </button>
            </div>
          </div>
        )}

        {/* ── O'chirish ── */}
        {on && !codes && (
          <div className="set-row" style={{ display: "block" }}>
            <div className="set-row__label">{t("twofa.disableTitle")}</div>
            <div className="set-row__hint" style={{ marginBottom: 10 }}>{t("twofa.disableHint")}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="fi ek-num" style={{ maxWidth: 160 }}
                value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="123456" autoComplete="one-time-code"
                aria-label={t("twofa.codeLabel")}
              />
              <button className="btn btn-danger btn-sm" onClick={disable}
                      disabled={busy || code.trim().length < 6}>
                <i className="fa-solid fa-shield-slash" aria-hidden="true" /> {t("twofa.disable")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
