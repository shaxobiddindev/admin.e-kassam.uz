import { useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
import { fmtDate, SHOP_STATUS } from "../utils";
import { Badge } from "../components/ui";
import Kpi from "../components/ek/Kpi";
import AttentionList from "../components/ek/AttentionList";

/* ══════════════════════════════════════════════════════════════════════════
   Superadmin bosh sahifasi — 07-ADMIN.md

   "Kassir paneli tezlik uchun. Bu panel tushunish uchun."
   Ekran bitta savolga javob beradi: tizimda bugun nima e'tibor talab qiladi?
   ══════════════════════════════════════════════════════════════════════════ */

/** Jadval shaklidagi skeleton — spinner emas, aks holda kontent kelganda sakraydi. */
function TableSkeleton({ rows = 6 }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <div className="ek-skel-row" key={i}>
          <span className="ek-skeleton" /><span className="ek-skeleton" /><span className="ek-skeleton" />
        </div>
      ))}
    </div>
  );
}

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

  const activeShops  = shops.filter(s => s.status === "ACTIVE").length;
  const blockedShops = shops.filter(s => s.status === "BLOCKED").length;
  const suspended    = shops.filter(s => s.status === "SUSPENDED").length;
  const activeUsers  = users.filter(u => u.enabled).length;
  const blockedUsers = users.filter(u => !u.enabled).length;
  const ownerless    = shops.filter(s => !s.ownerName).length;

  /* ── "E'tibor talab qiladi" — bo'sh satrlar ko'rsatilmaydi ─────────────── */
  const attention = [
    blockedShops && { id: "blocked", icon: "fa-ban", tone: "danger",
      text: "Bloklangan do'kon", count: blockedShops, onClick: () => setPage("shops") },
    suspended && { id: "suspended", icon: "fa-pause", tone: "warning",
      text: "To'xtatilgan do'kon", count: suspended, onClick: () => setPage("shops") },
    ownerless && { id: "ownerless", icon: "fa-user-slash", tone: "warning",
      text: "Egasi biriktirilmagan do'kon", count: ownerless, onClick: () => setPage("shops") },
    blockedUsers && { id: "blockedUsers", icon: "fa-user-lock", tone: "info",
      text: "Bloklangan xodim", count: blockedUsers, onClick: () => setPage("users") },
  ].filter(Boolean);

  return (
    <div>
      {/* ── KPI qatori — raqamlar sanaladi (.ek-countup) ─────────────────── */}
      <div className="kpi-row">
        <Kpi label="Jami do'konlar"  value={shops.length} />
        <Kpi label="Aktiv do'konlar" value={activeShops}
             delta={shops.length ? (activeShops / shops.length) * 100 - 100 : null} />
        <Kpi label="Jami xodimlar"   value={users.length} />
        <Kpi label="Aktiv xodimlar"  value={activeUsers} />
      </div>

      <div className="g2c">
        {/* ── Do'konlar jadvali ─────────────────────────────────────────── */}
        <div className="card">
          <div className="c-head">
            <span className="c-title"><i className="fa-solid fa-store" aria-hidden="true" />Do'konlar</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("shops")}>
              Barchasi <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </div>
          <div className="tw">
            {loading ? <TableSkeleton /> : (
              <table>
                <thead>
                  <tr><th>Do'kon</th><th>Kod</th><th>Egasi</th><th>Status</th><th>Sana</th></tr>
                </thead>
                <tbody>
                  {shops.slice(0, 8).map(shop => {
                    const st = SHOP_STATUS[shop.status] || { label: shop.status, color: "gray" };
                    return (
                      <tr key={shop.id}>
                        <td style={{ fontWeight: 700 }}>{shop.name}</td>
                        <td className="ek-num" style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{shop.code}</td>
                        <td style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                          {shop.ownerName || <i style={{ color: "var(--fg-tertiary)" }}>Yo'q</i>}
                        </td>
                        <td><Badge color={st.color}>{st.label}</Badge></td>
                        <td className="ek-num" style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{fmtDate(shop.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {shops.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--fg-tertiary)" }}>
                      Hali do'kon qo'shilmagan. "Do'konlar" bo'limidan birinchisini yarating.
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── E'tibor talab qiladi — panelning yuragi ────────────────────── */}
        <AttentionList items={loading ? [] : attention} />
      </div>
    </div>
  );
}
