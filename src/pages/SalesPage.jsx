import { useEffect, useState } from "react";
import { saleApi } from "../api";
import { money, fmtDateTime, SALE_STATUS, PAYMENT_LABELS } from "../utils";
import Modal from "../components/Modal";
import { Loader, Empty, Search, Badge, II, StatCard, confirmOk } from "../components/ui";

export default function SalesPage({ toast }) {
  const [sales, setSales]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("ALL");
  const [detail, setDetail]     = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setSales((await saleApi.getAll()).data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (sale) => {
    if (!confirmOk(`#${sale.id} sotuvni bekor qilishni tasdiqlaysizmi?`)) return;
    setCancelling(sale.id);
    try {
      await saleApi.cancel(sale.id);
      toast.success("Sotuv bekor qilindi");
      setDetail(null);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setCancelling(null); }
  };

  const filtered = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || String(s.id).includes(q)
      || s.cashierName?.toLowerCase().includes(q)
      || s.customerName?.toLowerCase().includes(q);
    const matchF = filter === "ALL" || s.status === filter;
    return matchQ && matchF;
  });

  // Statistika
  const totalAmount = sales
    .filter((s) => s.status !== "CANCELLED")
    .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

  const STATS = [
    { label: "Jami sotuvlar",  value: sales.length,   icon: "fa-receipt",    bg: "var(--blue-l)",   color: "var(--blue)" },
    { label: "Aktiv",          value: sales.filter((s) => s.status !== "CANCELLED").length, icon: "fa-check", bg: "var(--green-l)", color: "var(--green-d)" },
    { label: "Bekor qilingan", value: sales.filter((s) => s.status === "CANCELLED").length, icon: "fa-ban",   bg: "var(--red-l)",   color: "var(--red)"     },
    { label: "Jami summa",     value: money(totalAmount), icon: "fa-sack-dollar", bg: "var(--yellow-l)", color: "var(--yellow)" },
  ];

  const counts = {
    ALL:       sales.length,
    CREATED:   sales.filter((s) => s.status === "CREATED").length,
    PAID:      sales.filter((s) => s.status === "PAID").length,
    CANCELLED: sales.filter((s) => s.status === "CANCELLED").length,
  };

  return (
    <div>
      {/* Stat */}
      <div className="stats">
        {STATS.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="card">
        <div className="c-head">
          <div className="tabs" style={{ flexWrap: "wrap" }}>
            {[
              { k: "ALL",       l: `Barchasi (${counts.ALL})`       },
              { k: "PAID",      l: `To'langan (${counts.PAID})`      },
              { k: "CREATED",   l: `Yangi (${counts.CREATED})`       },
              { k: "CANCELLED", l: `Bekor (${counts.CANCELLED})`     },
            ].map(({ k, l }) => (
              <button key={k} className={`tab ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Search value={search} onChange={setSearch} placeholder="ID, kassir, mijoz..." style={{ width: 220 }} />
            <button className="btn btn-outline btn-sm" onClick={load}>
              <i className="fa-solid fa-rotate-right" />
            </button>
          </div>
        </div>

        <div className="tw">
          {loading ? <Loader /> : (
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Kassir</th>
                  <th>Mijoz</th>
                  <th>Summa</th>
                  <th>To'lov</th>
                  <th>Status</th>
                  <th>Sana</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((sale) => {
                  const st = SALE_STATUS[sale.status] || { label: sale.status, color: "gray" };
                  return (
                    <tr key={sale.id}>
                      <td className="mono fw8 c-dim">#{sale.id}</td>
                      <td className="fw7">{sale.cashierName || "—"}</td>
                      <td>{sale.customerName || <span className="c-dim">—</span>}</td>
                      <td className="mono fw8 c-blue">{money(sale.totalAmount)}</td>
                      <td style={{ fontSize: 13 }}>{PAYMENT_LABELS[sale.paymentType] || sale.paymentType}</td>
                      <td><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="c-dim" style={{ fontSize: 12 }}>{fmtDateTime(sale.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="bic b-blue" title="Batafsil" onClick={() => setDetail(sale)}>
                            <i className="fa-solid fa-eye" />
                          </button>
                          {sale.status !== "CANCELLED" && (
                            <button
                              className="bic b-red"
                              title="Bekor qilish"
                              onClick={() => handleCancel(sale)}
                              disabled={cancelling === sale.id}
                            >
                              <i className={`fa-solid ${cancelling === sale.id ? "fa-spinner fa-spin" : "fa-ban"}`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8}><Empty icon="fa-receipt" title="Sotuv topilmadi" /></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal
          title={`Sotuv #${detail.id}`}
          onClose={() => setDetail(null)}
          size="md"
          footer={
            <>
              {detail.status !== "CANCELLED" && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCancel(detail)}
                  disabled={cancelling === detail.id}
                >
                  <i className={`fa-solid ${cancelling === detail.id ? "fa-spinner fa-spin" : "fa-ban"}`} />
                  Bekor qilish
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setDetail(null)}>
                Yopish
              </button>
            </>
          }
        >
          {/* Ma'lumotlar */}
          <div className="ig">
            <II label="Kassir"   value={detail.cashierName} />
            <II label="Mijoz"    value={detail.customerName || "—"} />
            <II label="To'lov"   value={PAYMENT_LABELS[detail.paymentType] || detail.paymentType} />
            <II label="Status"   value={<Badge color={SALE_STATUS[detail.status]?.color}>{SALE_STATUS[detail.status]?.label}</Badge>} />
            <II label="Sana"     value={fmtDateTime(detail.createdAt)} />
            <II label="Jami"     value={<span className="mono fw8 c-blue">{money(detail.totalAmount)}</span>} />
          </div>

          {/* Mahsulotlar */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
            Mahsulotlar ({detail.items?.length || 0})
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Mahsulot</th><th>Soni</th><th>Narxi</th><th>Jami</th></tr></thead>
              <tbody>
                {(detail.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="fw7">{item.productName}</td>
                    <td><Badge color="blue">{item.quantity} dona</Badge></td>
                    <td className="mono">{money(item.price)}</td>
                    <td className="mono fw8 c-blue">{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
