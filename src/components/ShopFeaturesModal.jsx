import { useEffect, useState } from "react";
import { featureApi } from "../api";
import { useT } from "../lib/ek-i18n";
import Modal from "./Modal";
import { Badge } from "./ui";
import { Spinner, SkeletonList } from "./ek/Loading";

/* ══════════════════════════════════════════════════════════════════════════
   DO'KON YO'NALISHLARI VA MODULLARI (V49)

   ⚠ NIMA UCHUN. Ilova har bir do'konga BIR XIL ko'rinardi: sartaroshxona
   ham «Inventarizatsiya» va «Markirovka» bo'limlarini ko'rardi. Turli
   xizmat ko'rsatuvchi joylarga qo'yilganda bu chalkashlikka aylanadi.

   ⚠ BU EKRAN DO'KONNING INTERFEYSINI O'ZGARTIRADI. Modulni o'chirish —
   do'kondagi butun bo'limni yo'q qilish demak va u xodimga ertasi kuni
   bildiriladi. Shuning uchun bu yerda har bir o'zgarish OQIBATI bilan
   ko'rsatiladi: nechta modul yo'qolishi, qaysi biri qayerdan kelgani.

   ⚠ UCH MANBA — ekranda ajratiladi:
     DIRECTION     — yo'nalishdan kelgan (standart)
     OVERRIDE      — qo'lda qo'yilgan qaror
     NO_DIRECTION  — yo'nalish tanlanmagan, shuning uchun hammasi ochiq
     DEPENDENCY    — bog'liqlik qoidasi bekor qilgan (mijozsiz nasiya)

   Oxirgisi eng muhimi: usiz admin «yoqdim-ku, nega yo'q?» deb qolardi.
   ══════════════════════════════════════════════════════════════════════════ */

const SOURCE_TONE = {
  DIRECTION:    "gray",
  OVERRIDE:     "blue",
  NO_DIRECTION: "yellow",
  DEPENDENCY:   "red",
};

export default function ShopFeaturesModal({ shop, onClose, onSaved, toast }) {
  const { t } = useT();
  const [state,      setState]      = useState(null);
  const [catalog,    setCatalog]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [savingDirs, setSavingDirs] = useState(false);
  const [busyF,      setBusyF]      = useState(null);
  // Tanlov saqlanmaguncha faqat shu yerda yashaydi — «Saqlash» bosilmasa
  // do'konning interfeysi o'zgarmaydi.
  const [draft,      setDraft]      = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([featureApi.get(shop.id), featureApi.directions()])
      .then(([f, d]) => {
        if (!alive) return;
        setState(f.data || null);
        setDraft(new Set(f.data?.directions || []));
        setCatalog(d.data || []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [shop.id]);

  const toggleDir = (key) => {
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const dirty = state && draft &&
    (draft.size !== (state.directions || []).length ||
     (state.directions || []).some((d) => !draft.has(d)));

  const saveDirs = async () => {
    setSavingDirs(true);
    try {
      const res = await featureApi.setDirections(shop.id, [...draft]);
      setState(res.data || null);
      setDraft(new Set(res.data?.directions || []));
      toast.success(t("adm.features.dirsSaved"));
      onSaved?.();
    } catch (e) { toast.error(e.message); }
    finally { setSavingDirs(false); }
  };

  const override = async (feature, enabled) => {
    setBusyF(feature);
    try {
      const res = await featureApi.override(shop.id, feature, enabled, null);
      setState(res.data || null);
      toast.success(t(enabled === null ? "adm.features.cleared" : "adm.features.changed"));
      onSaved?.();
    } catch (e) { toast.error(e.message); }
    finally { setBusyF(null); }
  };

  /* Tanlangan yo'nalishlar YIG'INDISI — «Saqlash» bosilganda nima
     bo'lishini oldindan ko'rsatadi. Kesishma EMAS: ikkinchi yo'nalish
     qo'shish do'konni kambag'allashtirmaydi. */
  const previewFeatures = new Set(
    catalog.filter((c) => draft?.has(c.direction)).flatMap((c) => c.features)
  );

  const enabledNow = new Set(
    (state?.features || []).filter((f) => f.enabled).map((f) => f.feature)
  );

  /* «Saqlansa nima yo'qoladi» — eng muhim ogohlantirish. Faqat
     yo'nalish tanlangan holatda ma'noli: bo'sh tanlov «hammasi ochiq»
     degani. */
  const willLose = draft?.size
    ? [...enabledNow].filter((f) => !previewFeatures.has(f))
    : [];

  return (
    <Modal size="md" title={t("adm.features.title", { name: shop.name })} onClose={onClose}
           footer={<button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.close")}</button>}>

      {loading ? <SkeletonList rows={6} /> : !state ? (
        <div style={{ color:"var(--fg-secondary)" }}>{t("common.loadFailed")}</div>
      ) : (
        <>
          {/* ── Yo'nalishlar ───────────────────────────────────────────── */}
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                        color:"var(--fg-tertiary)", marginBottom:6 }}>
            <i className="fa-solid fa-diagram-project" aria-hidden="true" /> {t("adm.features.directions")}
          </div>

          {/* ⚠ «Sozlanmagan» holati ALOHIDA ko'rsatiladi: u
              «hammasi ataylab yoqilgan» bilan bir xil ko'rinmasligi
              kerak. Do'kon shunchaki hali tanlanmagan bo'lishi mumkin. */}
          {state.unconfigured && (
            <div style={{ fontSize:12, color:"var(--fg-warning)", marginBottom:8 }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> {t("adm.features.unconfigured")}
            </div>
          )}

          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            {catalog.map((c) => {
              const on = draft?.has(c.direction);
              return (
                <button key={c.direction}
                        className={`btn btn-sm ${on ? "btn-primary" : "btn-outline"}`}
                        onClick={() => toggleDir(c.direction)}
                        title={c.features.map((f) => t(`adm.feat.${f}`)).join(", ")}>
                  {on && <i className="fa-solid fa-check" />} {t(`adm.dir.${c.direction}`)}
                </button>
              );
            })}
          </div>

          {/* ⚠ OQIBAT OLDINDAN. Modul yo'qolishi do'kondagi bo'limning
              yo'qolishi demak va uni saqlagandan KEYIN bilish kech. */}
          {willLose.length > 0 && (
            <div style={{ fontSize:12, color:"var(--fg-danger)", marginBottom:8 }}>
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{" "}
              {t("adm.features.willLose", { n: willLose.length })}:{" "}
              {willLose.map((f) => t(`adm.feat.${f}`)).join(", ")}
            </div>
          )}
          {dirty && draft.size === 0 && (
            <div style={{ fontSize:12, color:"var(--fg-warning)", marginBottom:8 }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> {t("adm.features.emptyMeansAll")}
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <button className="btn btn-primary btn-sm" onClick={saveDirs} disabled={!dirty || savingDirs}>
              {savingDirs ? <><Spinner /> {t("common.saving")}</>
                          : <><i className="fa-solid fa-check" /> {t("adm.features.saveDirs")}</>}
            </button>
          </div>

          {/* ── Modullar ───────────────────────────────────────────────── */}
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                        color:"var(--fg-tertiary)", marginBottom:6 }}>
            <i className="fa-solid fa-toggle-on" aria-hidden="true" /> {t("adm.features.modules")}
          </div>
          <div style={{ fontSize:12, color:"var(--fg-secondary)", marginBottom:8 }}>
            {t("adm.features.modulesHint")}
          </div>

          {state.features.map((f) => (
            <div key={f.feature}
                 style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0",
                          borderBottom:"1px solid var(--border-subtle)" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{t(`adm.feat.${f.feature}`)}</div>
                <div style={{ fontSize:11, color:"var(--fg-tertiary)" }}>
                  {t(`adm.features.src.${f.source}`)}
                  {f.note ? ` — ${f.note}` : ""}
                  {f.changedBy ? ` (${f.changedBy})` : ""}
                </div>
              </div>

              <Badge color={f.enabled ? "green" : "gray"}>
                {t(f.enabled ? "adm.features.on" : "adm.features.off")}
              </Badge>

              {/* ⚠ Bog'liqlik qoidasi bekor qilgan modulni qo'lda
                  yoqib bo'lmaydi — server baribir uni yopadi. Tugma
                  o'rniga sabab ko'rsatiladi. */}
              {f.source === "DEPENDENCY" ? (
                <span style={{ fontSize:11, color:"var(--fg-tertiary)", whiteSpace:"nowrap" }}>
                  <i className="fa-solid fa-link-slash" aria-hidden="true" /> {t("adm.features.dependency")}
                </span>
              ) : (
                <div style={{ display:"flex", gap:4 }}>
                  <button className={`btn btn-sm ${f.enabled ? "btn-outline" : "btn-primary"}`}
                          disabled={busyF === f.feature}
                          onClick={() => override(f.feature, !f.enabled)}>
                    {busyF === f.feature ? <Spinner />
                      : t(f.enabled ? "adm.features.turnOff" : "adm.features.turnOn")}
                  </button>
                  {f.source === "OVERRIDE" && (
                    <button className="btn btn-outline btn-sm" title={t("adm.features.resetHint")}
                            disabled={busyF === f.feature}
                            onClick={() => override(f.feature, null)}>
                      <i className="fa-solid fa-rotate-left" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}
