import { useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
import { fmtDate, SHOP_STATUS } from "../utils";
import { Loader, Badge, StatCard } from "../components/ui";

export default function DashboardPage({ toast, setPage }) {
  const [shops,   setShops]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      shopApi.getAll().catch(() => ({ data: [] })),
      userApi.getAll().catch(() => ({ data: [] })),
    ]).then(([s, u]) => {
      setShops(s?.data || []);
      setUsers(u?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const activeShops   = shops.filter(s => s.status === "ACTIVE").length;
  const blockedShops  = shops.filter(s => s.status === "BLOCKED").length;
  const suspended     = shops.filter(s => s.status === "SUSPENDED").length;
  const activeUsers   = users.filter(u => u.enabled).length;
  const blockedUsers  = users.filter(u => !u.enabled).length;

  const STATS = [
    { label: "Jami do'konlar",    value: shops.length,  icon: "fa-store",        bg: "rgba(1,125,202,.1)", color: "var(--blue)"    },
    { label: "Aktiv do'konlar",   value: activeShops,   icon: "fa-circle-check", bg: "var(--green-l)",     color: "var(--green-d)" },
    { label: "Bloklangan do'kon", value: blockedShops,  icon: "fa-ban",          bg: "var(--red-l)",       color: "var(--red)"     },
    { label: "To'xtatilgan",      value: suspended,     icon: "fa-pause",        bg: "var(--yellow-l)",    color: "var(--yellow)"  },
    { label: "Jami xodimlar",     value: users.length,  icon: "fa-users",        bg: "rgba(1,125,202,.08)", color: "var(--blue)"   },
    { label: "Aktiv xodimlar",    value: activeUsers,   icon: "fa-user-check",   bg: "var(--green-l)",     color: "var(--green-d)" },
  ];

  return (
    <div>
      <div className="stats">
        {STATS.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="g2c">
        {/* Do'konlar jadvali */}
        <div className="card">
          <div className="c-head">
            <span className="c-title"><i className="fa-solid fa-store" />Do'konlar</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("shops")}>
              Barchasi <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Do'kon</th><th>Kod</th><th>Egasi</th><th>Status</th><th>Sana</th></tr>
              </thead>
              <tbody>
                {shops.slice(0, 8).map(shop => {
                  const st = SHOP_STATUS[shop.status] || { label: shop.status, color: "gray" };
                  return (
                    <tr key={shop.id}>
                      <td style={{ fontWeight:800 }}>{shop.name}</td>
                      <td style={{ fontFamily:"monospace", fontSize:11, color:"var(--text3)" }}>{shop.code}</td>
                      <td style={{ fontSize:12, color:"var(--text2)" }}>
                        {shop.ownerName || <i style={{ color:"var(--text3)" }}>Yo'q</i>}
                      </td>
                      <td><Badge color={st.color}>{st.label}</Badge></td>
                      <td style={{ fontSize:11, color:"var(--text3)" }}>{fmtDate(shop.createdAt)}</td>
                    </tr>
                  );
                })}
                {shops.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign:"center", padding:20, color:"var(--text3)" }}>
                    Do'kon yo'q
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tizim holati */}
        <div className="card">
          <div className="c-head">
            <span className="c-title"><i className="fa-solid fa-chart-pie" />Tizim holati</span>
          </div>
          <div className="c-body">
            {[
              { label: "Jami do'konlar",    val: shops.length,  color: "var(--blue)"    },
              { label: "Aktiv do'konlar",   val: activeShops,   color: "var(--green-d)" },
              { label: "Bloklangan",        val: blockedShops,  color: "var(--red)"     },
              { label: "To'xtatilgan",      val: suspended,     color: "var(--yellow)"  },
              { label: "─────────────────", val: "",            color: "var(--border)"  },
              { label: "Jami xodimlar",     val: users.length,  color: "var(--blue)"    },
              { label: "Aktiv xodimlar",    val: activeUsers,   color: "var(--green-d)" },
              { label: "Bloklangan xodim",  val: blockedUsers,  color: "var(--red)"     },
            ].map((row, i) => (
              <div key={i} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"10px 0",
                borderBottom: i < 7 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontSize:13, fontWeight:600, color:"var(--text2)" }}>{row.label}</span>
                <span style={{ fontSize:15, fontWeight:900, color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
