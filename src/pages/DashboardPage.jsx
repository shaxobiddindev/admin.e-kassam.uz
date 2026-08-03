import { useEffect, useState } from "react";
import { shopApi, userApi } from "../api";
import { fmtDate, SHOP_STATUS, shopStatus } from "../utils";
import { useT } from "../lib/ek-i18n";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { Badge } from "../components/ui";
import Kpi from "../components/ek/Kpi";
import AttentionList from "../components/ek/AttentionList";

/* ══════════════════════════════════════════════════════════════════════════
   Superadmin bosh sahifasi — 07-ADMIN.md

   "Kassir paneli tezlik uchun. Bu panel tushunish uchun."
   Ekran bitta savolga javob beradi: tizimda bugun nima e'tibor talab qiladi?
   ══════════════════════════════════════════════════════════════════════════ */

export default function DashboardPage({ toast, setPage }) {
  const { t } = useT();
  const [shops,   setShops]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  // Tez javobda skeleton umuman chizilmaydi (180ms), chizilsa 400ms turadi.
  const busy = useLoading(loading);

  useEffect(() => {
    Promise.all([shopApi.getAll(), userApi.getAll()])
      .then(([s, u]) => {
        setShops(s?.data || []);
        setUsers(u?.data || []);
      })
      // Ilgari xato JIMGINA yutilardi va foydalanuvchi bo'sh, "hammasi joyida"
      // ko'rinishdagi panelni ko'rardi. Endi aniq aytiladi.
      .catch((e) => toast?.error?.(`${t("common.loadFailed")}: ${e.message}`))
      .finally(() => setLoading(false));
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
      text: t("adm.dash.attBlockedShops"), count: blockedShops, onClick: () => setPage("shops") },
    suspended && { id: "suspended", icon: "fa-pause", tone: "warning",
      text: t("adm.dash.attSuspended"), count: suspended, onClick: () => setPage("shops") },
    ownerless && { id: "ownerless", icon: "fa-user-slash", tone: "warning",
      text: t("adm.dash.attOwnerless"), count: ownerless, onClick: () => setPage("shops") },
    blockedUsers && { id: "blockedUsers", icon: "fa-user-lock", tone: "info",
      text: t("adm.dash.attBlockedUsers"), count: blockedUsers, onClick: () => setPage("users") },
  ].filter(Boolean);

  return (
    <div>
      {/* ── KPI qatori — raqamlar sanaladi (.ek-countup) ─────────────────── */}
      <div className="kpi-row">
        <Kpi label={t("adm.dash.totalShops")}  value={shops.length} />
        {/* `delta` ATAYLAB berilmaydi: u "avvalgi davrga nisbatan o'zgarish"
            degani. Ilgari bu yerda `aktiv/jami*100-100` turardi va 4 tadan
            3 tasi aktiv bo'lsa "−25% pasayish" deb qizil ko'rsatardi.
            Haqiqiy taqqoslash uchun backend tarixiy raqamni qaytarishi kerak. */}
        <Kpi label={t("adm.dash.activeShops")} value={activeShops} />
        <Kpi label={t("adm.dash.totalUsers")}   value={users.length} />
        <Kpi label={t("adm.dash.activeUsers")}  value={activeUsers} />
      </div>

      <div className="g2c">
        {/* ── Do'konlar jadvali ─────────────────────────────────────────── */}
        <div className="card">
          <div className="c-head">
            <span className="c-title"><i className="fa-solid fa-store" aria-hidden="true" />{t("adm.dash.shops")}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("shops")}>
              {t("adm.dash.seeAll")} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </div>
          <div className="tw">
            {busy ? <SkeletonTable rows={6} cols={["wide", "text", "text", "narrow", "text"]} /> : (
              <table>
                <thead>
                  <tr><th>{t("adm.shops.colShop")}</th><th>{t("adm.shops.colCode")}</th><th>{t("adm.shops.colOwner")}</th><th>{t("common.status")}</th><th>{t("common.date")}</th></tr>
                </thead>
                <tbody>
                  {shops.slice(0, 8).map(shop => {
                    const st = { ...shopStatus(shop.status), color: SHOP_STATUS[shop.status]?.color || "gray" };
                    return (
                      <tr key={shop.id}>
                        <td style={{ fontWeight: 700 }}>{shop.name}</td>
                        <td className="ek-num" style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{shop.code}</td>
                        <td style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                          {shop.ownerName || <i style={{ color: "var(--fg-secondary)" }}>{t("adm.dash.noOwner")}</i>}
                        </td>
                        <td><Badge color={st.color}>{st.label}</Badge></td>
                        <td className="ek-num" style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{fmtDate(shop.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {shops.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--fg-secondary)" }}>
                      {t("adm.dash.noShops")}
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── E'tibor talab qiladi — panelning yuragi ────────────────────── */}
        <AttentionList items={busy ? [] : attention} />
      </div>
    </div>
  );
}
