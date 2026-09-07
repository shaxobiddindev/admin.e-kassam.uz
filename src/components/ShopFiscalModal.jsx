import { useState } from "react";
import { shopApi } from "../api";
import { useT } from "../lib/ek-i18n";
import Modal from "./Modal";
import Select from "./ek/Select";
import { FG, Badge } from "./ui";
import { Spinner } from "./ek/Loading";

/* ══════════════════════════════════════════════════════════════════════════
   DO'KONNING FISKAL REKVIZITLARI VA REJIMI (V81)

   ⚠ NEGA BU EKRAN ADMIN PANELIDA, DO'KON EGASIDA EMAS.

   Fiskal rejim — tizimdagi YAGONA sozlama bo'lib, u yoqilganda
   do'konning KASSASI TO'XTASHI mumkin: rekvizit yoki ro'yxatdan
   o'tgan kassa bo'lmasa, server har bir sotuvni rad etadi.

   Bu tugmani do'kon egasiga berish — unga o'z kassasini bilmasdan
   o'chirish imkonini berish demakdir. Ega ertasi kuni «nega sotuv
   o'tmayapti» deb qo'ng'iroq qilardi va sabab uning o'zi bosgan
   tugmada bo'lardi.

   ⚠ SERVER HAM SHU QOIDANI QO'YADI: yoqishdan oldin u uchta
   rekvizitni VA kamida bitta tayyor kassani tekshiradi. Bu yerdagi
   to'siq — o'sha qoidaning ko'rinishi, o'zi emas.

   ⚠ KASSALAR BU YERDA QO'SHILMAYDI. Ular do'kon konteksti
   (`TenantContext`) ostida yashaydi va ega o'z ilovasidan qo'shadi
   (`app` → Sozlamalar → Fiskal rekvizitlar). Admin panelidan ularni
   boshqarish uchun butun boshqa yo'l kerak bo'lardi, foydasi esa —
   yiliga bir marta.
   ══════════════════════════════════════════════════════════════════════════ */

export default function ShopFiscalModal({ shop, onClose, onSaved, toast }) {
  const { t } = useT();
  const [form, setForm] = useState({
    tin: shop.tin || "",
    /* ⚠ Bo'sh bo'lsa `LEGAL` — «tanlanmagan» emas, STANDART:
       do'konlarning aksariyati yuridik shaxs yoki YaTT. Saqlanmaguncha
       serverda hech narsa o'zgarmaydi. */
    tinType: shop.tinType || "LEGAL",
    fiscalAddress: shop.fiscalAddress || "",
    commissionAgentTin: shop.commissionAgentTin || "",
  });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(shop.fiscalEnabled));

  const digits = (v) => v.replace(/\D/g, "");
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((p) => ({ ...p, [k]: digits(e.target.value) }));

  /* ⚠ Serverdagi `fiscalReady` bilan AYNAN bir xil qoida. Nusxa
     ko'chirilgani ataylab: bu yerda u FORMANING joriy holatiga
     qaraydi (hali saqlanmagan), server esa saqlangan qiymatga. */
  const ready = Boolean(form.tin && form.tinType && form.fiscalAddress);

  const saveRequisites = async () => {
    setSaving(true);
    try {
      await shopApi.setFiscalRequisites(shop.id, form);
      toast.success(t("common.saved"));
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await shopApi.setFiscalEnabled(shop.id, !enabled);
      setEnabled(!enabled);
      toast.success(t("common.saved"));
      onSaved?.();
    } catch (e) {
      /* ⚠ Server rad etsa SABAB shu yerda ko'rinadi: «kamida bitta
         kassa qo'shing» degan xabar aynan shu yo'l bilan adminga
         yetadi. Uni yutib yuborish tugmani jimgina ishlamaydigan
         qilib qo'yardi. */
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t("adm.fiscal.title", { name: shop.name })} onClose={onClose} size="md" footer={
      <><button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.close")}</button>
        <button className="btn btn-primary btn-sm" onClick={saveRequisites} disabled={saving}>
          {saving ? <><Spinner /> {t("common.saving")}</>
                  : <><i className="fa-solid fa-check" /> {t("common.save")}</>}
        </button></>
    }>
      <div className="ek-note" style={{ marginBottom: 14 }}>
        <i className={`fa-solid ${enabled ? "fa-circle-check" : "fa-circle-info"}`} />
        <div>
          <div>
            {t("adm.fiscal.state")}:{" "}
            <Badge tone={enabled ? "green" : "gray"}>
              {enabled ? t("adm.fiscal.on") : t("adm.fiscal.off")}
            </Badge>
          </div>
          <div className="fhint">{t("adm.fiscal.stateHint")}</div>
        </div>
      </div>

      <FG label={t("adm.fiscal.tinType")}>
        <Select
          block variant="field" ariaLabel={t("adm.fiscal.tinType")}
          value={form.tinType}
          onChange={(v) => setForm((p) => ({ ...p, tinType: v }))}
          options={[
            { value: "LEGAL", label: t("adm.fiscal.legal") },
            { value: "INDIVIDUAL", label: t("adm.fiscal.individual") },
          ]}
        />
      </FG>

      <div className="g2">
        <FG label={form.tinType === "LEGAL" ? t("adm.fiscal.tin") : t("adm.fiscal.pinfl")}
             hint={form.tinType === "LEGAL" ? t("adm.fiscal.tin9") : t("adm.fiscal.tin14")}>
          <input className="fi ek-num" inputMode="numeric"
                 maxLength={form.tinType === "LEGAL" ? 9 : 14}
                 value={form.tin} onChange={setNum("tin")} />
        </FG>
        <FG label={t("adm.fiscal.agentTin")} hint={t("adm.fiscal.agentTinHint")}>
          <input className="fi ek-num" inputMode="numeric" maxLength={14}
                 value={form.commissionAgentTin} onChange={setNum("commissionAgentTin")} />
        </FG>
      </div>

      <FG label={t("adm.fiscal.address")} hint={t("adm.fiscal.addressHint")}>
        <input className="fi" maxLength={300}
               value={form.fiscalAddress} onChange={set("fiscalAddress")} />
      </FG>

      {/* ══ YOQISH ══════════════════════════════════════════════════════
          ⚠ SAQLASHDAN ALOHIDA tugma va bu ataylab: rekvizitni yozish
          «fiskal rejimga o'tamiz» degani emas. Ikkalasi bitta tugmaga
          birlashtirilsa, manzilni to'g'irlagan admin bir vaqtda
          do'konni fiskal rejimga o'tkazib yuborardi. */}
      <div className="ek-note" style={{ marginTop: 4, display: "block" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("adm.fiscal.switch")}</div>
        <div className="fhint" style={{ marginBottom: 10 }}>
          {enabled ? t("adm.fiscal.offHint") : t("adm.fiscal.onHint")}
        </div>
        <button className={`btn btn-sm ${enabled ? "btn-outline" : "btn-primary"}`}
                disabled={busy || (!enabled && !ready)}
                onClick={toggle}>
          {busy ? <Spinner />
                : <i className={`fa-solid ${enabled ? "fa-toggle-off" : "fa-toggle-on"}`} />}{" "}
          {enabled ? t("adm.fiscal.turnOff") : t("adm.fiscal.turnOn")}
        </button>
        {!enabled && !ready && (
          <div className="fhint" style={{ marginTop: 6, color: "var(--fg-warning)" }}>
            {t("adm.fiscal.incomplete")}
          </div>
        )}
      </div>
    </Modal>
  );
}
