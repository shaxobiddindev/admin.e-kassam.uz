import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { Badge, FG } from "./ui";
import Select from "./ek/Select";
import { NumField, DateField } from "./ek/EkFields";
import { SkeletonForm, SkeletonList, Spinner } from "./ek/Loading";
import { shopApi, subscriptionApi } from "../api";
import { useConfirm } from "../context/ConfirmProvider";
import { useT } from "../lib/ek-i18n";
import { can } from "../routes";
import { asArray } from "../lib/ek-array";
import {
  fmtDate, fmtDateTime, money, SHOP_PLAN, SHOP_STATUS, shopPlan, shopStatus,
  paymentProvider, paymentStatus, subEvent, SUBSCRIPTION_EVENT,
} from "../utils";
import {
  PERIODS, afterGrant, afterPayment, daysLeft, fill, isUnlimited, isoDay, limitOf,
  suggestedAmount, timeline, tone,
} from "../lib/ek-subscription";

/* ══════════════════════════════════════════════════════════════════════════
   OBUNANI BOSHQARISH (V145, 2026-10-04)

   Egasi: «obunalarni admin to'liq boshqara olsin — xohlaganiga bepul obuna
   yoki cheksiz obuna yoki uni bekor qila olish, hullas hamma kerakli
   narsalar, professional dizayn bilan».

   ⚠ ILGARI bu oyna faqat TO'LOV qayd etardi. Sinovni uzaytirish, hamkorga
   bepul berish yoki xato to'lovni qaytarish uchun bazaga qo'lda SQL kerak edi.

   Tuzilishi — admin savollari tartibida: (1) hozir qanday holatda? —
   yuqoridagi karta; (2) nima qilaman? — oltita amal; (3) oldin nima bo'lgan? —
   tarix. Har amal saqlashdan OLDIN natijani ko'rsatadi («Yangi muddat:
   …»): sana server bilan bir xil qoidada hisoblanadi (`ek-subscription.js`).

   ⚠ Har amal YANGI holatni qaytaradi (server `Detail`) — oyna ikkinchi
   so'rov yubormaydi va eski raqamlarni ko'rsatib turmaydi.
   ══════════════════════════════════════════════════════════════════════════ */

const PAID_PLANS = ["BASIC", "PREMIUM", "ENTERPRISE"];
const ALL_PLANS = ["FREE", ...PAID_PLANS];
const ACTIONS = [
  { k: "pay",       icon: "fa-money-bill-wave" },
  { k: "grant",     icon: "fa-gift" },
  { k: "unlimited", icon: "fa-infinity" },
  { k: "plan",      icon: "fa-arrow-right-arrow-left" },
  { k: "date",      icon: "fa-calendar-check" },
  { k: "cancel",    icon: "fa-ban", danger: true },
];

/* Tariflar katalogi o'zgarmaydi — bir marta so'raladi. */
let plansCache = null;

const planOpts = (keys) => keys.map((k) => ({ value: k, label: shopPlan(k).label, icon: SHOP_PLAN[k]?.icon }));
const limitText = (n, t) => (n === -1 ? t("sub.limitNone") : String(n ?? "—"));

export default function SubscriptionManager({ shopId, shopName, onClose, onChanged, toast, perms }) {
  const { t } = useT();
  const confirm = useConfirm();
  const canEdit = can(perms, "BILLING_REGISTER");
  const [detail, setDetail] = useState(null);
  const [plans, setPlans] = useState(plansCache || []);
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [voidId, setVoidId] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  const load = () => subscriptionApi.detail(shopId)
    .then((r) => setDetail(r.data))
    .catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    if (!plansCache) {
      subscriptionApi.plans()
        .then((r) => { plansCache = asArray(r.data); setPlans(plansCache); })
        .catch(() => {});
    }
  }, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = detail?.summary;
  const payments = useMemo(() => asArray(detail?.payments), [detail]);
  const items = useMemo(() => timeline(asArray(detail?.events), payments), [detail, payments]);
  const payById = useMemo(() => Object.fromEntries(payments.map((p) => [p.id, p])), [payments]);

  /* Amal muvaffaqiyatli bo'ldi: yangi holat, xabar, ro'yxat yangilanadi. */
  const done = (res, fallback) => {
    if (res?.data) setDetail(res.data);
    toast.success(res?.message || fallback);
    setAction(null);
    onChanged?.();
  };

  const run = async (fn, fallback) => {
    setSaving(true);
    try { done(await fn(), fallback); }
    catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const voidPayment = async (paymentId) => {
    if (!voidReason.trim()) { toast.error(t("sub.f.reasonNeed")); return; }
    await run(() => subscriptionApi.cancelPayment(shopId, paymentId, { reason: voidReason.trim() }), t("sub.payVoided"));
    setVoidId(null);
    setVoidReason("");
  };

  return (
    <Modal title={t("sub.title", { name: s?.name || shopName || "" })} onClose={onClose} size="lg" footer={
      <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.close")}</button>
    }>
      {!detail ? <SkeletonForm fields={4} /> : (
        <div className="subm">
          <Summary d={detail} t={t} />

          {canEdit ? (
            <>
              <div className="subm-acts" role="group" aria-label={t("sub.actions")}>
                {ACTIONS.map((a) => (
                  <button key={a.k} type="button"
                          className={`subm-act${action === a.k ? " is-on" : ""}${a.danger ? " is-danger" : ""}`}
                          aria-pressed={action === a.k}
                          onClick={() => setAction(action === a.k ? null : a.k)}>
                    <i className={`fa-solid ${a.icon}`} aria-hidden="true" />
                    <span className="subm-act__t">{t(`sub.act.${a.k}`)}</span>
                    <span className="subm-act__h">{t(`sub.act.${a.k}Hint`)}</span>
                  </button>
                ))}
              </div>

              {action === "pay" && (
                <PayForm s={s} plans={plans} t={t} saving={saving}
                  onSubmit={(body) => run(async () => {
                    await shopApi.addPayment(shopId, body);
                    return subscriptionApi.detail(shopId).then((r) => ({ ...r, message: t("bill.registered") }));
                  }, t("bill.registered"))} />
              )}
              {action === "grant" && (
                <GrantForm s={s} t={t} saving={saving}
                  onSubmit={(body) => run(() => subscriptionApi.grant(shopId, body), t("sub.done"))} />
              )}
              {action === "unlimited" && (
                <UnlimitedForm s={s} t={t} saving={saving}
                  onSubmit={(body) => run(() => subscriptionApi.unlimited(shopId, body), t("sub.done"))} />
              )}
              {action === "plan" && (
                <PlanForm d={detail} plans={plans} t={t} saving={saving}
                  onSubmit={(body) => run(() => subscriptionApi.changePlan(shopId, body), t("sub.done"))} />
              )}
              {action === "date" && (
                <DateForm s={s} t={t} saving={saving}
                  onSubmit={(body) => run(() => subscriptionApi.setDate(shopId, body), t("sub.done"))} />
              )}
              {action === "cancel" && (
                <CancelForm s={s} t={t} saving={saving}
                  onSubmit={async (body) => {
                    const ok = await confirm({
                      title: t("sub.cancelAsk"),
                      message: t("sub.cancelAskMsg", { name: s.name }),
                      type: "danger",
                      confirmText: t("sub.do.cancel"),
                    });
                    if (ok) run(() => subscriptionApi.cancel(shopId, body), t("sub.done"));
                  }} />
              )}
            </>
          ) : (
            <div className="ek-note">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <span>{t("sub.readOnly")}</span>
            </div>
          )}

          <h3 className="subm-h">
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> {t("sub.history")}
          </h3>
          {!items.length ? (
            <p className="subm-empty">{t("sub.historyEmpty")}</p>
          ) : (
            <ol className="subm-tl">
              {items.map((e) => {
                const ev = subEvent(e.type);
                const pay = e.paymentId ? payById[e.paymentId] : null;
                const voided = pay?.status === "CANCELLED";
                return (
                  <li key={e.id} className="subm-tl__i" data-tone={SUBSCRIPTION_EVENT[e.type]?.tone}>
                    <span className="subm-tl__dot" aria-hidden="true">
                      <i className={`fa-solid ${ev.icon || "fa-circle"}`} />
                    </span>
                    <div className="subm-tl__b">
                      <div className="subm-tl__t">
                        <b>{ev.label}</b>
                        {e.type === "PAYMENT" && pay && (
                          <Badge color={voided ? "gray" : "green"}>{paymentStatus(pay.status).label}</Badge>
                        )}
                        {e.amount != null && e.type === "PAYMENT" && (
                          <span className="ek-num subm-tl__amt">{money(e.amount)}</span>
                        )}
                      </div>
                      <div className="subm-tl__d">
                        <EventChange e={e} t={t} />
                        {pay && <span>{paymentProvider(pay.provider).label}</span>}
                      </div>
                      {e.note && <div className="subm-tl__n">«{e.note}»</div>}
                      <div className="subm-tl__m">
                        <span className="ek-num">{fmtDateTime(e.createdAt)}</span>
                        <span>{e.actor === "SYSTEM" ? t("sub.bySystem") : (e.actor || "—")}</span>
                      </div>
                      {canEdit && e.type === "PAYMENT" && pay && !voided && (
                        voidId === pay.id ? (
                          <div className="subm-void">
                            <input className="fi" maxLength={500} autoFocus value={voidReason}
                                   aria-label={t("sub.f.reason")} placeholder={t("sub.f.voidPh")}
                                   onChange={(ev2) => setVoidReason(ev2.target.value)} />
                            <button className="btn btn-danger btn-sm" disabled={saving} onClick={() => voidPayment(pay.id)}>
                              {saving ? <Spinner /> : <i className="fa-solid fa-rotate-left" aria-hidden="true" />}
                              {t("sub.payVoid")}
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => { setVoidId(null); setVoidReason(""); }}>
                              {t("common.cancel")}
                            </button>
                            <p className="subm-hint">{t("sub.payVoidHint", { n: pay.periodMonths * 30 })}</p>
                          </div>
                        ) : (
                          <button type="button" className="subm-link" onClick={() => { setVoidId(pay.id); setVoidReason(""); }}>
                            {t("sub.payVoid")}
                          </button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── Holat kartasi ───────────────────────────────────────────────────────── */
function Summary({ d, t }) {
  const s = d.summary;
  const left = daysLeft(s.planExpiresAt);
  const tn = tone(s);
  const leftText = isUnlimited(s) ? t("sub.noEnd")
    : left === 0 ? t("bill.expiresToday")
    : left < 0 ? t("bill.expiredAgo", { n: Math.abs(left) })
    : t("bill.expiresIn", { n: left });
  return (
    <section className="subm-sum" data-tone={tn} aria-label={t("sub.now")}>
      <div className="subm-sum__top">
        <Badge color={SHOP_PLAN[s.plan]?.color || "gray"}>
          <i className={`fa-solid ${SHOP_PLAN[s.plan]?.icon || "fa-hourglass-half"}`} aria-hidden="true" />
          {s.plan ? shopPlan(s.plan).label : t("adm.shops.noPlan")}
        </Badge>
        <Badge color={SHOP_STATUS[s.status]?.color || "gray"}>{shopStatus(s.status).label}</Badge>
        <span className="subm-sum__code ek-num">{s.code}</span>
      </div>
      <div className="subm-sum__main">
        {isUnlimited(s) ? (
          <span className="subm-sum__date"><i className="fa-solid fa-infinity" aria-hidden="true" /> {t("sub.unlimited")}</span>
        ) : (
          <span className="subm-sum__date ek-num">{t("sub.until", { date: fmtDate(s.planExpiresAt) })}</span>
        )}
        <span className="subm-sum__left">{leftText}</span>
      </div>
      <div className="subm-bar" aria-hidden="true"><span style={{ width: `${Math.round(fill(s) * 100)}%` }} /></div>
      <dl className="subm-facts">
        <div><dt>{t("sub.staff")}</dt><dd className="ek-num">{d.staffUsed} / {limitText(d.staffLimit, t)}</dd></div>
        <div><dt>{t("sub.branches")}</dt><dd className="ek-num">{d.branchesUsed} / {limitText(d.branchesLimit, t)}</dd></div>
        <div><dt>{t("sub.totalPaid")}</dt><dd className="ek-num">{money(s.totalPaid || 0)}</dd></div>
        <div><dt>{t("sub.lastPaid")}</dt><dd className="ek-num">{s.lastPaidAt ? fmtDate(s.lastPaidAt) : "—"}</dd></div>
      </dl>
      {!isUnlimited(s) && <p className="subm-hint">{t("sub.grace", { n: d.graceDays })}</p>}
      {s.planRequested && (
        <div className="ek-note ek-note--warning">
          <i className="fa-solid fa-hand" aria-hidden="true" />
          <span>{t("sub.requested", { plan: shopPlan(s.planRequested).label })}</span>
        </div>
      )}
    </section>
  );
}

/* ── «Oldin → keyin» qatori ──────────────────────────────────────────────── */
function EventChange({ e, t }) {
  const parts = [];
  /* Eski to'lov (V145 dan oldingi) — oldingi tarif noma'lum, faqat to'langan tarif. */
  if (e.legacy && e.planAfter) parts.push(shopPlan(e.planAfter).label);
  else if (e.planBefore !== e.planAfter && (e.planBefore || e.planAfter)) {
    parts.push(`${e.planBefore ? shopPlan(e.planBefore).label : "—"} → ${e.planAfter ? shopPlan(e.planAfter).label : "—"}`);
  }
  const end = (v) => (v ? fmtDate(v) : t("sub.unlimited"));
  if (e.expiresBefore !== e.expiresAfter || e.type === "PAYMENT") {
    parts.push(e.legacy ? t("sub.untilShort", { date: end(e.expiresAfter) }) : `${end(e.expiresBefore)} → ${end(e.expiresAfter)}`);
  }
  if (e.days) parts.push(e.days > 0 ? t("sub.plusDays", { n: e.days }) : t("sub.minusDays", { n: Math.abs(e.days) }));
  if (e.statusBefore && e.statusAfter && e.statusBefore !== e.statusAfter) {
    parts.push(`${shopStatus(e.statusBefore).label} → ${shopStatus(e.statusAfter).label}`);
  }
  return parts.map((p, i) => <span key={i} className="ek-num">{p}</span>);
}

/* ── Formalar ────────────────────────────────────────────────────────────── */
function Preview({ children, tone: tn }) {
  return <div className="subm-prev" data-tone={tn}><i className="fa-solid fa-arrow-right" aria-hidden="true" /> {children}</div>;
}

function Submit({ saving, icon, label, danger, onClick, disabled }) {
  return (
    <div className="subm-form__go">
      <button type="button" className={`btn ${danger ? "btn-danger" : "btn-primary"} btn-sm`}
              disabled={saving || disabled} onClick={onClick}>
        {saving ? <Spinner /> : <i className={`fa-solid ${icon}`} aria-hidden="true" />} {label}
      </button>
    </div>
  );
}

function NoteField({ t, value, onChange }) {
  return (
    <FG label={t("sub.f.note")}>
      <input className="fi" maxLength={500} value={value} placeholder={t("sub.f.notePh")}
             onChange={(e) => onChange(e.target.value)} />
    </FG>
  );
}

function PayForm({ s, plans, t, saving, onSubmit }) {
  const [plan, setPlan] = useState(s.plan && s.plan !== "FREE" ? s.plan : "BASIC");
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [provider, setProvider] = useState("MANUAL");
  const [txn, setTxn] = useState("");
  const [note, setNote] = useState("");
  const suggested = suggestedAmount(plans, plan, months);
  /* Summa TAKLIF qilinadi (narx × oy), qo'lda o'zgartirilgach — tegilmaydi:
     chegirma yoki shartnoma narxi bo'lishi mumkin. */
  useEffect(() => { if (!touched) setAmount(suggested ? String(suggested) : ""); }, [suggested, touched]);
  const until = afterPayment({ ...s, plan }, Number(months) || 1);
  const ok = Number(amount) > 0 && Number(months) >= 1 && Number(months) <= 36;
  return (
    <div className="subm-form">
      <div className="g2">
        <FG label={t("bill.plan")}>
          <Select block variant="field" ariaLabel={t("bill.plan")} value={plan} onChange={setPlan} options={planOpts(PAID_PLANS)} />
        </FG>
        <FG label={t("bill.months")}>
          <div className="subm-chips">
            {[1, 3, 6, 12].map((m) => (
              <button key={m} type="button" className={`subm-chip${Number(months) === m ? " is-on" : ""}`}
                      aria-pressed={Number(months) === m} onClick={() => setMonths(m)}>
                {t("sub.months", { n: m })}
              </button>
            ))}
            <NumField className="fi ek-num subm-chips__n" kind="int" min={1} max={36} value={months}
                      aria-label={t("bill.months")} onChange={(e) => setMonths(e.target.value)} />
          </div>
        </FG>
      </div>
      <FG label={`${t("bill.amount")} *`}
          hint={suggested ? t("sub.priceHint", { price: money(suggested / (Number(months) || 1)), n: Number(months) || 1 })
                          : t("sub.priceDeal")}>
        <NumField className="fi ek-num" kind="money" value={amount}
                  onChange={(e) => { setTouched(true); setAmount(e.target.value); }} />
      </FG>
      <div className="g2">
        <FG label={t("bill.provider")}>
          <Select block variant="field" ariaLabel={t("bill.provider")} value={provider} onChange={setProvider}
                  options={["MANUAL", "PAYME", "CLICK"].map((k) => ({ value: k, label: paymentProvider(k).label, icon: paymentProvider(k).icon }))} />
        </FG>
        <FG label={t("bill.txnId")} hint={t("bill.txnHint")}>
          <input className="fi ek-num" maxLength={128} value={txn} onChange={(e) => setTxn(e.target.value)} />
        </FG>
      </div>
      <NoteField t={t} value={note} onChange={setNote} />
      <Preview>{until ? t("sub.preview", { date: fmtDate(until) }) : t("sub.previewUnlimited")}</Preview>
      <Submit saving={saving} icon="fa-check" label={t("bill.action")} disabled={!ok}
              onClick={() => onSubmit({ plan, months: Number(months) || 1, amount: Number(amount),
                                        provider, providerTransactionId: txn.trim() || null, note: note.trim() || null })} />
    </div>
  );
}

function GrantForm({ s, t, saving, onSubmit }) {
  const [plan, setPlan] = useState("");
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const n = Number(days) || 0;
  if (isUnlimited(s)) {
    return <div className="subm-form"><div className="ek-note"><i className="fa-solid fa-infinity" aria-hidden="true" /><span>{t("sub.grantUnlimited")}</span></div></div>;
  }
  return (
    <div className="subm-form">
      <FG label={t("sub.f.days")}>
        <div className="subm-chips">
          {PERIODS.map((p) => (
            <button key={p} type="button" className={`subm-chip${n === p ? " is-on" : ""}`}
                    aria-pressed={n === p} onClick={() => setDays(p)}>
              {t(`sub.p.${p}`)}
            </button>
          ))}
          <NumField className="fi ek-num subm-chips__n" kind="int" min={1} max={3650} value={days}
                    aria-label={t("sub.f.days")} onChange={(e) => setDays(e.target.value)} />
        </div>
      </FG>
      <FG label={t("bill.plan")}>
        <Select block variant="field" ariaLabel={t("bill.plan")} value={plan} onChange={setPlan}
                options={[{ value: "", label: t("sub.f.keepPlan", { plan: shopPlan(s.plan || "FREE").label }), icon: "fa-equals" }, ...planOpts(ALL_PLANS)]} />
      </FG>
      <NoteField t={t} value={note} onChange={setNote} />
      {n >= 1 && <Preview>{t("sub.preview", { date: fmtDate(afterGrant(s.planExpiresAt, n)) })}</Preview>}
      <Submit saving={saving} icon="fa-gift" label={t("sub.do.grant", { n })} disabled={n < 1 || n > 3650}
              onClick={() => onSubmit({ plan: plan || null, days: n, note: note.trim() || null })} />
    </div>
  );
}

function UnlimitedForm({ s, t, saving, onSubmit }) {
  const [plan, setPlan] = useState(s.plan && s.plan !== "FREE" ? s.plan : "PREMIUM");
  const [note, setNote] = useState("");
  return (
    <div className="subm-form">
      <div className="ek-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /><span>{t("sub.unlimitedInfo")}</span></div>
      <FG label={t("bill.plan")}>
        <Select block variant="field" ariaLabel={t("bill.plan")} value={plan} onChange={setPlan} options={planOpts(PAID_PLANS)} />
      </FG>
      <NoteField t={t} value={note} onChange={setNote} />
      <Preview tone="success">{t("sub.previewUnlimited")}</Preview>
      <Submit saving={saving} icon="fa-infinity" label={t("sub.do.unlimited")}
              onClick={() => onSubmit({ plan, note: note.trim() || null })} />
    </div>
  );
}

function PlanForm({ d, plans, t, saving, onSubmit }) {
  const s = d.summary;
  const options = ALL_PLANS.filter((k) => k !== (s.plan || "FREE") && !(k === "FREE" && isUnlimited(s)));
  const [plan, setPlan] = useState(options[0]);
  const [note, setNote] = useState("");
  const staffLimit = limitOf(plans, plan, "maxStaff");
  const branchLimit = limitOf(plans, plan, "maxBranches");
  const over = (staffLimit !== -1 && staffLimit != null && d.staffUsed > staffLimit)
    || (branchLimit !== -1 && branchLimit != null && d.branchesUsed > branchLimit);
  return (
    <div className="subm-form">
      <FG label={t("sub.f.newPlan")}>
        <Select block variant="field" ariaLabel={t("sub.f.newPlan")} value={plan} onChange={setPlan} options={planOpts(options)} />
      </FG>
      <dl className="subm-facts subm-facts--cmp">
        <div><dt>{t("sub.staff")}</dt><dd className="ek-num">{limitText(d.staffLimit, t)} → {limitText(staffLimit, t)}</dd></div>
        <div><dt>{t("sub.branches")}</dt><dd className="ek-num">{limitText(d.branchesLimit, t)} → {limitText(branchLimit, t)}</dd></div>
      </dl>
      {over && (
        <div className="ek-note ek-note--warning">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <span>{t("sub.planOver", { staff: d.staffUsed, branches: d.branchesUsed })}</span>
        </div>
      )}
      <NoteField t={t} value={note} onChange={setNote} />
      <Preview>{t("sub.planKeepsDate")}</Preview>
      <Submit saving={saving} icon="fa-arrow-right-arrow-left" label={t("sub.do.plan")} disabled={!plan}
              onClick={() => onSubmit({ plan, note: note.trim() || null })} />
    </div>
  );
}

function DateForm({ s, t, saving, onSubmit }) {
  const [until, setUntil] = useState(isoDay(s.planExpiresAt && daysLeft(s.planExpiresAt) > 0
    ? s.planExpiresAt : Date.now() + 30 * 86400000));
  const [plan, setPlan] = useState("");
  const [note, setNote] = useState("");
  const today = isoDay(Date.now());
  const ok = Boolean(until) && until >= today;
  return (
    <div className="subm-form">
      <div className="g2">
        <FG label={t("sub.f.until")} hint={ok ? undefined : t("sub.f.untilPast")}>
          <DateField className="fi ek-num" value={until} min={today} onChange={(e) => setUntil(e.target.value)} />
        </FG>
        <FG label={t("bill.plan")}>
          <Select block variant="field" ariaLabel={t("bill.plan")} value={plan} onChange={setPlan}
                  options={[{ value: "", label: t("sub.f.keepPlan", { plan: shopPlan(s.plan || "FREE").label }), icon: "fa-equals" }, ...planOpts(ALL_PLANS)]} />
        </FG>
      </div>
      <NoteField t={t} value={note} onChange={setNote} />
      {ok && <Preview>{t("sub.preview", { date: fmtDate(`${until}T12:00:00`) })}</Preview>}
      <Submit saving={saving} icon="fa-calendar-check" label={t("sub.do.date")} disabled={!ok}
              onClick={() => onSubmit({ until, plan: plan || null, note: note.trim() || null })} />
    </div>
  );
}

function CancelForm({ s, t, saving, onSubmit }) {
  const [reason, setReason] = useState("");
  const stopped = s.status === "SUSPENDED" && !isUnlimited(s) && daysLeft(s.planExpiresAt) <= 0;
  return (
    <div className="subm-form subm-form--danger">
      <div className="ek-note ek-note--danger">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <span>{stopped ? t("sub.cancelAlready") : t("sub.cancelInfo")}</span>
      </div>
      <FG label={`${t("sub.f.reason")} *`}>
        <textarea className="fi" rows={2} maxLength={500} value={reason} placeholder={t("sub.f.reasonPh")}
                  onChange={(e) => setReason(e.target.value)} />
      </FG>
      <Submit saving={saving} danger icon="fa-ban" label={t("sub.do.cancel")} disabled={!reason.trim()}
              onClick={() => onSubmit({ reason: reason.trim() })} />
    </div>
  );
}
