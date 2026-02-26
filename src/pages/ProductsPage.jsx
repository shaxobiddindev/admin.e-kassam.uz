import { useEffect, useState } from "react";
import { productApi } from "../api";
import { money } from "../utils";
import { Loader, Empty, Search, Badge } from "../components/ui";

export default function ProductsPage({ toast }) {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([productApi.getAll(), productApi.getCategories()])
      .then(([p, c]) => { setProducts(p.data || []); setCategories(c.data || []); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name?.toLowerCase().includes(q) || (p.barcode || "").includes(q);
    const matchC = catFilter === "ALL" || p.categoryId === catFilter;
    return matchQ && matchC;
  });

  const activeCount = products.filter((p) => p.active).length;

  return (
    <div>
      {/* Statistika */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Jami", value: products.length, color: "var(--blue)" },
          { label: "Aktiv", value: activeCount, color: "var(--green-d)" },
          { label: "Nofaol", value: products.length - activeCount, color: "var(--red)" },
          { label: "Kategoriyalar", value: categories.length, color: "var(--purple)" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ flex: 1, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="c-head">
          <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
            <Search value={search} onChange={setSearch} placeholder="Nom yoki barkod..." style={{ width: 240 }} />
            <select
              className="fi"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="ALL">Barcha kategoriyalar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="c-dim" style={{ fontSize: 12, fontWeight: 700 }}>
            {filtered.length} ta mahsulot
          </div>
        </div>

        <div className="tw">
          {loading ? <Loader /> : (
            <table>
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  <th>Barkod</th>
                  <th>Kategoriya</th>
                  <th>Sotuv narxi</th>
                  <th>Tan narxi</th>
                  <th>Foyda</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((p) => {
                  const profit = Number(p.salePrice) - Number(p.costPrice);
                  const margin = p.costPrice > 0
                    ? Math.round((profit / Number(p.costPrice)) * 100) : 0;
                  return (
                    <tr key={p.id}>
                      <td className="fw8">{p.name}</td>
                      <td>
                        {p.barcode
                          ? <span className="mono badge badge-gray">{p.barcode}</span>
                          : <span className="c-dim">—</span>}
                      </td>
                      <td>
                        {p.categoryName
                          ? <Badge color="indigo">{p.categoryName}</Badge>
                          : <span className="c-dim">—</span>}
                      </td>
                      <td className="mono fw8 c-blue">{money(p.salePrice)}</td>
                      <td className="mono c-mut">{money(p.costPrice)}</td>
                      <td>
                        <span className="mono fw7" style={{ color: profit >= 0 ? "var(--green-d)" : "var(--red)" }}>
                          {money(profit)} ({margin}%)
                        </span>
                      </td>
                      <td>
                        <Badge color={p.active ? "green" : "red"}>
                          {p.active ? "Aktiv" : "Nofaol"}
                        </Badge>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7}><Empty icon="fa-box-open" title="Mahsulot topilmadi" /></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
