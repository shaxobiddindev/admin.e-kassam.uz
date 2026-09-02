import { useEffect, useState } from "react";
import { customerApi } from "../api";
import { useT } from "../lib/ek-i18n";
import { Empty, Search } from "../components/ui";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import ExportButtons from "../components/ExportButtons";
import { groupDigits } from "../lib/ek-format";

/* ══════════════════════════════════════════════════════════════════════════
   MIJOZLAR — DO'KON BO'YICHA FAQAT SON (V50)

   ⚠ BU EKRAN ATAYLAB KAMAYTIRILDI. Ilgari bu yerda barcha do'konlar
   bo'ylab to'liq mijozlar ro'yxati turardi: ism, telefon raqami va
   qancha xarid qilgani; ustiga qidiruv ham — telefon bo'yicha, butun
   tizim bo'ylab. Ya'ni panelga kirgan odam istalgan telefon raqamini
   kiritib, uning qaysi do'konlarda qancha pul sarflaganini ko'ra olardi.

   ⚠ Bu shunchaki ortiqcha imkoniyat emasdi. Mijoz o'z ismini va
   raqamini BIZGA emas, DO'KONGA bergan; do'kon esa mijozlar bazasini
   bizga emas, o'z kassasiga ishonib topshirgan. Ikkala tomon ham bunga
   rozilik bermagan.

   ⚠ NEGA MASKALASH EMAS. «Ismni yulduzcha bilan yopamiz» varianti rad
   etildi: maskalangan ro'yxat baribir «bu do'konda falon odam falon pul
   sarflagan» degan ma'lumotni saqlaydi va uni boshqa manba bilan
   solishtirib ochish qiyin emas. Ma'lumot javobda BO'LMASA, uni ochib
   ham bo'lmaydi — server endi uni umuman qaytarmaydi.

   Qoladigan yagona narsa — SON. U obuna tarifini tekshirish uchun kerak
   («bizda 3000 mijoz bor» degan gapni tekshirish mumkin bo'lsin) va hech
   kimni tanitmaydi.

   ⚠ Do'konga qarashli savol (nizo, shikoyat) do'konning O'ZIDA hal
   qilinadi: egasi o'z tokeni bilan mijozni ko'radi. Bizning panelimizda
   bunday yo'l bo'lmasligi kerak — bo'lsa, u ertami-kechmi ishlatiladi.
   ══════════════════════════════════════════════════════════════════════════ */

export default function CustomersPage({ toast }) {
  const { t } = useT();
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const busy = useLoading(loading);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    setLoading(true);
    customerApi.countsByShop()
      .then((r) => setRows(r.data || []))
      .catch((e) => toast.error(t("adm.customers.loadFailed", { msg: e.message })))
      .finally(() => setLoading(false));
  }, []);

  /* ⚠ Qidiruv BRAUZERDA va DO'KON bo'yicha. Ilgari u serverda, mijoz
     ismi va telefoni bo'yicha ishlardi — aynan o'sha yo'l yopildi.
     Do'konlar soni yuzlab, mijozlarniki esa minglab bo'lgani uchun
     bu yerda serverga chiqishning hojati yo'q. */
  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || r.shopName?.toLowerCase().includes(q) || r.shopCode?.toLowerCase().includes(q);
  });

  const total = filtered.reduce((sum, r) => sum + (r.customerCount || 0), 0);

  const exportHeaders = [t("adm.shops.colShop"), t("adm.shops.colCode"), t("adm.customers.colCount")];
  const exportRows = filtered.map((r) => [r.shopName || "", r.shopCode || "", r.customerCount || 0]);

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <span className="c-title">
            <i className="fa-solid fa-address-book" aria-hidden="true" />
            {t("adm.customers.title")}
          </span>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <Search value={search} onChange={setSearch}
                    placeholder={t("adm.customers.searchShop")} style={{ width:240 }} />
            <ExportButtons name="mijozlar" headers={exportHeaders} rows={exportRows} toast={toast} />
          </div>
        </div>

        {/* ⚠ NEGA BU YERDA ISM YO'Q — bir qatorda tushuntiriladi.
            Usiz ekran «buzilgan» yoki «to'liq yuklanmagan» bo'lib
            ko'rinardi va kimdir eski ro'yxatni qaytarishni so'rardi. */}
        <div style={{ margin:"0 14px 10px", fontSize:12, color:"var(--fg-secondary)" }}>
          <i className="fa-solid fa-shield-halved" aria-hidden="true" /> {t("adm.customers.privacyNote")}
        </div>

        <div className="tw">
          {busy ? <SkeletonTable rows={7} cols={["wide", "text", "num"]} /> : (
            <table>
              <thead>
                <tr>
                  <th>{t("adm.shops.colShop")}</th>
                  <th>{t("adm.shops.colCode")}</th>
                  <th className="num">{t("adm.customers.colCount")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  <>
                    {filtered.map((r) => (
                      <tr key={r.shopId}>
                        <td style={{ fontWeight:700 }}>{r.shopName}</td>
                        <td className="ek-num" style={{ fontSize:11, color:"var(--fg-tertiary)" }}>
                          {r.shopCode}
                        </td>
                        <td className="num ek-num" style={{ fontWeight:700 }}>
                          {groupDigits(r.customerCount || 0)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ fontWeight:700 }}>{t("common.total")}</td>
                      <td className="num ek-num" style={{ fontWeight:700 }}>{groupDigits(total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr><td colSpan={3}>
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
