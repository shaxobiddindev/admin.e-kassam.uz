import { useEffect, useState } from "react";
import { customerApi } from "../api";
import { fmtDate, money } from "../utils";
import { useT } from "../lib/ek-i18n";
import { Empty, Search, Avatar } from "../components/ui";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";

/* ══════════════════════════════════════════════════════════════════════════
   Mijozlar — FAQAT O'QISH.

   Tahrirlash olib tashlandi: front `PUT /superadmin/customers/{id}` ni
   chaqirardi, backendda esa bunday endpoint yo'q edi — "Saqlash" har doim
   405 qaytarardi. Endpoint qo'shish o'rniga amal olib tashlandi, chunki
   mijoz — DO'KONNING ma'lumoti va uni do'kon xodimi kassir ilovasida
   tahrirlaydi (o'sha yo'l tenant bilan chegaralangan).

   Buning o'rniga ekranga nazorat uchun kerak narsa qo'shildi: mijoz QAYSI
   DO'KONGA tegishli va qancha xarid qilgan. Ilgari barcha do'konlarning
   mijozlari aralash chiqardi va bir xil ismlarni ajratib bo'lmasdi.
   ══════════════════════════════════════════════════════════════════════════ */

export default function CustomersPage({ toast }) {
  const { t } = useT();
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  // Tez javobda skeleton umuman chizilmaydi; chizilsa kamida 400ms turadi.
  const busy = useLoading(loading);
  const [search,    setSearch]    = useState("");

  const load = (q = "") => {
    setLoading(true);
    customerApi.getAll(q ? `search=${encodeURIComponent(q)}` : "")
      .then(r => setCustomers(r.data || []))
      .catch(e => toast.error(t("adm.customers.loadFailed", { msg: e.message })))
      .finally(() => setLoading(false));
  };

  // Qidiruv SERVERDA bajariladi (ism va telefon bo'yicha). Ilgari `load(q)`
  // server parametrini qo'llardi, lekin uni hech kim chaqirmasdi va filtr
  // faqat brauzerda ishlardi — 10 000 mijozda sahifa cho'kardi.
  // 300ms kechikish: har harfda so'rov yuborilmasin.
  useEffect(() => {
    const id = setTimeout(() => load(search.trim()), search ? 300 : 0);
    return () => clearTimeout(id);
  }, [search]);

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <span className="c-title">
            <i className="fa-solid fa-address-book" aria-hidden="true" />
            {t("adm.customers.title")}
          </span>
          <div style={{ display:"flex", gap:8 }}>
            <Search value={search} onChange={setSearch}
              placeholder={t("adm.customers.searchPlaceholder")} style={{ width:240 }} />
          </div>
        </div>
        <div className="tw">
          {busy ? <SkeletonTable rows={7} cols={["wide", "text", "text", "num", "num"]} /> : (
            <table>
              <thead>
                <tr>
                  <th>{t("adm.customers.colCustomer")}</th>
                  <th>{t("common.phone")}</th>
                  <th>{t("adm.shops.colShop")}</th>
                  <th className="num">{t("cust.totalSpent")}</th>
                  <th className="num">{t("adm.customers.colRegistered")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? customers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar name={c.fullName} size={30} radius={8} />
                        <span style={{ fontWeight:700 }}>{c.fullName}</span>
                      </div>
                    </td>
                    <td className="ek-num" style={{ fontSize:12, color:"var(--fg-secondary)" }}>
                      {c.phone || "—"}
                    </td>
                    <td style={{ fontSize:12 }}>
                      {c.shopName ? (
                        <div style={{ display:"flex", flexDirection:"column" }}>
                          <span style={{ fontWeight:600 }}>{c.shopName}</span>
                          <span className="ek-num" style={{ fontSize:10, color:"var(--fg-secondary)" }}>
                            {c.shopCode}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color:"var(--fg-secondary)" }}>—</span>
                      )}
                    </td>
                    <td className="num ek-num" style={{ fontWeight:700 }}>
                      {money(c.totalSpent || 0)}
                    </td>
                    <td className="num ek-num" style={{ fontSize:12, color:"var(--fg-secondary)" }}>
                      {fmtDate(c.createdAt)}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>
                    <Empty icon="fa-address-book" title={t("adm.customers.notFound")} />
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
