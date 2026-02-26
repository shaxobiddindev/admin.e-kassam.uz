import { useState, useEffect } from "react";
import { reportApi } from "../api";
import { money, fmtDate, PAYMENT_LABELS } from "../utils";
import { Loader, Empty, StatCard, Badge } from "../components/ui";

const PERIOD_TABS = [
  { k: "daily",   l: "Bugun"      },
  { k: "weekly",  l: "Bu hafta"   },
  { k: "monthly", l: "Bu oy"      },
  { k: "custom",  l: "Maxsus"     },
];

const STATS_CFG = [
  { key: "totalRevenue", label: "Jami savdo",    icon: "fa-sack-dollar",    bg: "rgba(1,125,202,.09)", color: "var(--blue)"    },
  { key: "totalProfit",  label: "Sof foyda",     icon: "fa-arrow-trend-up", bg: "var(--green-l)",      color: "var(--green-d)" },
  { key: "totalSales",   label: "Sotuvlar soni", icon: "fa-receipt",        bg: "var(--yellow-l)",     color: "var(--yellow)"  },
  { key: "totalCost",    label: "Tan narxi",      icon: "fa-coins",          bg: "var(--purple-l, #fdf4ff)", color: "#9333ea" },
];

const today = new Date().toISOString().slice(0, 10);

export default function AnalyticsPage({ toast }) {
  const [period, setPeriod] = useState("daily");
  const [from, setFrom]     = useState(today);
  const [to, setTo]         = useState(today);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (p = period) => {
    setLoading(true);
    try {
      let res;
      if (p === "daily")   res = await reportApi.daily();
      else if (p === "weekly")  res = await reportApi.weekly();
      else if (p === "monthly") res = await reportApi.monthly();
      else {
        // custom
        if (!from || !to) { toast.error("Sanalarni kiriting"); setLoading(false); return; }
        if (new Date(from) > new Date(to)) { toast.error("Boshlanish sanasi katta"); setLoading(false); return; }
        res = await reportApi.custom(
          new Date(from).toISOString(),
          new Date(to + "T23:59:59").toISOString()
        );
      }
      setData(res.data);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (period !== "custom") fetchData(period);
    else setData(null);
  }, [period]);

  return (
    <div>
      {/* Period tanlash */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="c-body" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="tabs">
            {PERIOD_TABS.map(({ k, l }) => (
              <button key={k} className={`tab ${period === k ? "on" : ""}`} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>

          {period === "custom" && (
            <>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="flb">Boshlanish</label>
                <input className="fi" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="flb">Tugash</label>
                <input className="fi" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => fetchData("custom")} disabled={loading}>
                <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-search"}`} />
                Hisobot olish
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? <Loader /> : data ? (
        <>
          {/* Stat kartochkalar */}
          <div className="stats">
            {STATS_CFG.map((cfg) => (
              <StatCard
                key={cfg.key}
                label={cfg.label}
                value={cfg.key === "totalSales" ? (data[cfg.key] || 0) : money(data[cfg.key])}
                icon={cfg.icon}
                bg={cfg.bg}
                color={cfg.color}
              />
            ))}
          </div>

          <div className="g2c">
            {/* To'lov turlari */}
            <div className="card">
              <div className="c-head">
                <div className="c-title"><i className="fa-solid fa-credit-card" />To'lov turlari</div>
              </div>
              <div className="c-body">
                {data.paymentSummary?.length ? (
                  <>
                    {data.paymentSummary.map((p, i, arr) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "12px 0",
                          borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <span className="fw7" style={{ fontSize: 14 }}>
                          {PAYMENT_LABELS[p.paymentType] || p.paymentType}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <div className="mono fw8 c-blue">{money(p.amount)}</div>
                          {data.totalRevenue > 0 && (
                            <div className="c-dim" style={{ fontSize: 11 }}>
                              {Math.round((Number(p.amount) / Number(data.totalRevenue)) * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Progress bar */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: "var(--border)", display: "flex" }}>
                        {data.paymentSummary.map((p, i) => {
                          const pct = data.totalRevenue > 0
                            ? (Number(p.amount) / Number(data.totalRevenue)) * 100 : 0;
                          const colors = ["#017dca", "#22c55e", "#f59e0b"];
                          return (
                            <div key={i} style={{ width: `${pct}%`, background: colors[i % colors.length], transition: ".5s" }} />
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : <Empty title="Ma'lumot yo'q" />}
              </div>
            </div>

            {/* Top mahsulotlar */}
            <div className="card">
              <div className="c-head">
                <div className="c-title">
                  <i className="fa-solid fa-trophy" style={{ color: "var(--yellow)" }} />
                  Top mahsulotlar
                </div>
              </div>
              <div className="tw">
                <table>
                  <thead>
                    <tr><th>#</th><th>Mahsulot</th><th>Soni</th><th>Daromad</th></tr>
                  </thead>
                  <tbody>
                    {data.topProducts?.length ? data.topProducts.map((p, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: i < 3 ? "var(--yellow-l)" : "var(--bg)",
                            color: i < 3 ? "var(--yellow)" : "var(--text3)",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 900,
                          }}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="fw7">{p.productName}</td>
                        <td><Badge color="blue">{p.totalQuantity}</Badge></td>
                        <td className="mono fw8 c-blue">{money(p.totalRevenue)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4}><Empty title="Ma'lumot yo'q" /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sana oralig'i */}
          {(data.from || data.to) && (
            <div style={{
              marginTop: 12, padding: "10px 16px", background: "var(--bg)",
              borderRadius: 10, fontSize: 12, color: "var(--text2)", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <i className="fa-solid fa-calendar c-blue" />
              Hisobot davri: {fmtDate(data.from)} — {fmtDate(data.to)}
            </div>
          )}
        </>
      ) : period === "custom" ? (
        <div className="card">
          <div className="c-body">
            <Empty icon="fa-calendar-days" title="Sana tanlang" subtitle="Yuqoridan davr belgilab hisobot oling" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
