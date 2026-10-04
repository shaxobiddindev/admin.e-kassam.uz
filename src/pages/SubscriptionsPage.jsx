import { useCallback, useEffect, useMemo, useState } from "react";
import { shopApi, subscriptionApi } from "../api";
import { fmtDate, money, SHOP_PLAN, SHOP_STATUS, shopPlan, shopStatus } from "../utils";
import { useT } from "../lib/ek-i18n";
import { Badge, Empty, Search } from "../components/ui";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { asArray } from "../lib/ek-array";
import { rankItems } from "../lib/ek-search";
import ExportButtons from "../components/ExportButtons";
import SubscriptionManager from "../components/SubscriptionManager";
import { isoDate } from "../utils/export";
import { FILTERS, FILTER_ORDER, counts, daysLeft, fill, isUnlimited, tone } from "../lib/ek-subscription";

/* ══════════════════════════════════════════════════════════════════════════
   OBUNALAR (V145, 2026-10-04)

   Egasi: «obunalarni admin to'liq boshqara olsin». Ilgari obuna faqat
   Do'konlar ro'yxatidagi bitta ustun va kichik «to'lov» oynasi edi: qaysi
   do'konning muddati tugayotgani, kim sinovda, kim cheksiz — buni ko'rish
   uchun ro'yxatni ko'z bilan titkilash kerak edi.

   Bu sahifa admin savollaridan quriladi: yuqorida — «nechta va qancha?»
   (raqamlar), bo'limlar — «kimga qo'ng'iroq qilaman?» (tugayapti, muddati
   o'tgan, to'xtatilgan), qatorni bosish — boshqaruv oynasi.

   ⚠ Faqat BOSH do'konlar: filial o'z obunasiga ega emas, u bosh do'kon
   bilan birga yashaydi (server ham shunday qaytaradi).
   ══════════════════════════════════════════════════════════════════════════ */

export default function SubscriptionsPage({ toast, user }) {
  const { t } = useT();
  const perms = user?.permissions ?? null;
  const [rows, setRows] = useState([]);
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    return subscriptionApi.list()
      .then((r) => setRows(asArray(r.data)))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
    /* Tushum — bosh sahifa bilan BIR XIL raqam (o'sha so'rov). */
    shopApi.stats().then((r) => setIncome(r.data?.subscriptionIncome30d ?? null)).catch(() => {});
  }, [load]);

  const c = useMemo(() => counts(rows), [rows]);
  const shown = useMemo(() => {
    const inTab = rows.filter((r) => FILTERS[tab](r, Date.now()));
    return search.trim()
      ? rankItems(inTab, search, {
          codes:  (r) => [r.code],
          digits: (r) => [r.phone],
          texts:  (r) => [r.name, r.code, r.ownerName],
        })
      : inTab;
  }, [rows, tab, search]);

  const KPIS = [
    { k: "paid",      icon: "fa-crown",            n: c.paid },
    { k: "trial",     icon: "fa-hourglass-half",   n: c.trial },
    { k: "soon",      icon: "fa-bell",             n: c.soon,      tone: c.soon ? "warning" : undefined },
    { k: "expired",   icon: "fa-hourglass-end",    n: c.expired,   tone: c.expired ? "danger" : undefined },
    { k: "unlimited", icon: "fa-infinity",         n: c.unlimited },
  ];

  const exportHeaders = [t("sub.col.shop"), t("adm.shops.colCode"), t("sub.col.plan"), t("sub.col.status"),
    t("sub.col.expires"), t("sub.col.lastPaid"), t("sub.col.totalPaid")];
  const exportRows = shown.map((r) => [
    r.name, r.code, r.plan ? shopPlan(r.plan).label : "", shopStatus(r.status).label,
    isUnlimited(r) ? t("sub.unlimited") : isoDate(r.planExpiresAt), isoDate(r.lastPaidAt), Number(r.totalPaid) || 0,
  ]);

  return (
    <div className="subs">
      <div className="subs-kpis">
        {KPIS.map((x) => (
          <button key={x.k} type="button" className={`subs-kpi${tab === x.k ? " is-on" : ""}`}
                  data-tone={x.tone} aria-pressed={tab === x.k} onClick={() => setTab(tab === x.k ? "all" : x.k)}>
            <span className="subs-kpi__i" aria-hidden="true"><i className={`fa-solid ${x.icon}`} /></span>
            <span className="subs-kpi__l">{t(`sub.kpi.${x.k}`)}</span>
            <span className="subs-kpi__v ek-num">{busy ? "—" : x.n}</span>
          </button>
        ))}
        <div className="subs-kpi subs-kpi--money">
          <span className="subs-kpi__i" aria-hidden="true"><i className="fa-solid fa-sack-dollar" /></span>
          <span className="subs-kpi__l">{t("sub.kpi.income")}</span>
          <span className="subs-kpi__v ek-num">{income == null ? "—" : money(income)}</span>
        </div>
      </div>

      <div className="card">
        <div className="c-head">
          <div className="tabs subs-tabs" role="tablist" aria-label={t("nav.subscriptions")}>
            {FILTER_ORDER.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k}
                      className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
                {t(`sub.tab.${k}`)} <span className="subs-cnt ek-num">{c[k]}</span>
              </button>
            ))}
          </div>
          <div className="subs-tools">
            <Search value={search} onChange={setSearch} placeholder={t("sub.search")} style={{ width: 240 }} />
            <ExportButtons name="obunalar" headers={exportHeaders} rows={exportRows} toast={toast} />
          </div>
        </div>

        <div className="tw">
          {busy ? (
            <SkeletonTable rows={8} cols={["wide", "text", "text", "wide", "text", "num", "narrow"]} />
          ) : shown.length === 0 ? (
            <Empty icon="fa-credit-card" title={t("sub.empty")} subtitle={search ? t("sub.emptySearch") : undefined} />
          ) : (
            <table className="subs-table">
              <thead>
                <tr>
                  <th>{t("sub.col.shop")}</th>
                  <th>{t("sub.col.plan")}</th>
                  <th>{t("sub.col.status")}</th>
                  <th>{t("sub.col.expires")}</th>
                  <th>{t("sub.col.lastPaid")}</th>
                  <th className="num">{t("sub.col.totalPaid")}</th>
                  <th aria-label={t("sub.manage")} />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => <Row key={r.shopId} r={r} t={t} onOpen={() => setOpen(r)} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {open && (
        <SubscriptionManager shopId={open.shopId} shopName={open.name} perms={perms} toast={toast}
                             onClose={() => setOpen(null)} onChanged={load} />
      )}
    </div>
  );
}

function Row({ r, t, onOpen }) {
  const left = daysLeft(r.planExpiresAt);
  const tn = tone(r);
  const leftText = isUnlimited(r) ? t("sub.noEnd")
    : left === 0 ? t("bill.expiresToday")
    : left < 0 ? t("bill.expiredAgo", { n: Math.abs(left) })
    : t("bill.expiresIn", { n: left });
  return (
    <tr className="subs-row" onClick={onOpen}>
      <td>
        <div className="subs-shop">
          <span className="subs-shop__n">{r.name}</span>
          <span className="subs-shop__m">
            <span className="ek-num">{r.code}</span>
            {r.ownerName && <span>{r.ownerName}</span>}
            {r.branches > 0 && <span>{t("sub.branchesN", { n: r.branches })}</span>}
          </span>
        </div>
      </td>
      <td>
        <Badge color={SHOP_PLAN[r.plan]?.color || "gray"}>
          <i className={`fa-solid ${SHOP_PLAN[r.plan]?.icon || "fa-hourglass-half"}`} aria-hidden="true" />
          {r.plan ? shopPlan(r.plan).label : t("adm.shops.noPlan")}
        </Badge>
        {r.planRequested && (
          <span className="subs-req" title={t("adm.shops.planRequestedHint")}>
            {t("sub.reqShort", { plan: shopPlan(r.planRequested).label })}
          </span>
        )}
      </td>
      <td><Badge color={SHOP_STATUS[r.status]?.color || "gray"}>{shopStatus(r.status).label}</Badge></td>
      <td>
        <div className="subs-exp" data-tone={tn}>
          <span className="subs-exp__d ek-num">
            {isUnlimited(r) ? <><i className="fa-solid fa-infinity" aria-hidden="true" /> {t("sub.unlimited")}</> : fmtDate(r.planExpiresAt)}
          </span>
          <span className="subs-exp__l">{leftText}</span>
          <span className="subs-exp__bar" aria-hidden="true"><span style={{ width: `${Math.round(fill(r) * 100)}%` }} /></span>
        </div>
      </td>
      <td className="ek-num subs-dim">{r.lastPaidAt ? fmtDate(r.lastPaidAt) : t("sub.noPayments")}</td>
      <td className="num ek-num subs-money">{Number(r.totalPaid) > 0 ? money(r.totalPaid) : "—"}</td>
      <td className="subs-go">
        <button type="button" className="btn btn-outline btn-sm"
                onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <i className="fa-solid fa-sliders" aria-hidden="true" /> {t("sub.manage")}
        </button>
      </td>
    </tr>
  );
}
