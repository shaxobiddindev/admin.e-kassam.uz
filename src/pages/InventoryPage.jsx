import { useEffect, useState } from "react";
import { inventoryApi } from "../api";
import { Loader, Empty, Search, Badge } from "../components/ui";

export default function InventoryPage({ toast }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("ALL"); // ALL | LOW | OK

  useEffect(() => {
    inventoryApi.getAll()
      .then((r) => setItems(r.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchQ = !q || item.productName?.toLowerCase().includes(q);
    const isLow = item.quantity <= item.minQuantity;
    const matchF = filter === "ALL" || (filter === "LOW" && isLow) || (filter === "OK" && !isLow);
    return matchQ && matchF;
  });

  const lowCount = items.filter((i) => i.quantity <= i.minQuantity).length;

  return (
    <div>
      {/* Statistika */}
      <div className="stats" style={{ marginBottom: 18 }}>
        {[
          { label: "Jami mahsulot", value: items.length, icon: "fa-boxes-stacked", bg: "rgba(1,125,202,.09)", color: "var(--blue)" },
          { label: "Kam qolgan",    value: lowCount,      icon: "fa-triangle-exclamation", bg: "var(--red-l)",   color: "var(--red)"     },
          { label: "Yetarli",       value: items.length - lowCount, icon: "fa-check", bg: "var(--green-l)", color: "var(--green-d)" },
        ].map((s, i) => (
          <div key={i} className="sc">
            <div className="sc-icon" style={{ background: s.bg, color: s.color }}>
              <i className={`fa-solid ${s.icon}`} />
            </div>
            <div>
              <div className="sc-val">{s.value}</div>
              <div className="sc-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="c-head">
          <div className="tabs">
            {[
              { k: "ALL", l: `Barchasi (${items.length})` },
              { k: "LOW", l: `Kam qolgan (${lowCount})` },
              { k: "OK",  l: `Yetarli (${items.length - lowCount})` },
            ].map(({ k, l }) => (
              <button key={k} className={`tab ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <Search value={search} onChange={setSearch} placeholder="Mahsulot nomi..." style={{ width: 220 }} />
        </div>

        <div className="tw">
          {loading ? <Loader /> : (
            <table>
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  <th>Miqdor</th>
                  <th>Min. miqdor</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((item) => {
                  const isLow = item.quantity <= item.minQuantity;
                  const pct = item.minQuantity > 0
                    ? Math.min((item.quantity / item.minQuantity) * 100, 200) : 100;
                  return (
                    <tr key={item.id}>
                      <td className="fw8">{item.productName}</td>
                      <td>
                        <span className="mono fw9" style={{
                          fontSize: 16,
                          color: isLow ? "var(--red)" : "var(--text)",
                        }}>
                          {item.quantity}
                        </span>
                        <span className="c-dim" style={{ fontSize: 11, marginLeft: 4 }}>dona</span>
                      </td>
                      <td className="c-mut mono">{item.minQuantity}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3, transition: ".3s",
                              width: `${Math.min(pct, 100)}%`,
                              background: isLow ? "var(--red)" : "var(--green)",
                            }} />
                          </div>
                          <Badge color={isLow ? "red" : "green"}>
                            {isLow
                              ? <><i className="fa-solid fa-triangle-exclamation" /> Kam</>
                              : <><i className="fa-solid fa-check" /> Yetarli</>}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={4}><Empty icon="fa-warehouse" title="Mahsulot topilmadi" /></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
