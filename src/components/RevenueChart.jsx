import { Suspense, lazy, useState } from "react";
import { useT } from "../lib/ek-i18n";
import { money, groupDigits } from "../lib/ek-format";
import { Empty } from "./ui";
import ExportButtons from "./ExportButtons";

/* ══════════════════════════════════════════════════════════════════════════
   14 kunlik tushum — grafik VA raqamli jadval

   07-ADMIN.md "Grafiklar": «Grafik yonida har doim raqamli jadval varianti
   bo'ladi (a11y va eksport uchun)». Shuning uchun bu yerda ikkita ko'rinish
   bor va ular BIR XIL ma'lumotni ko'rsatadi — jadval grafikning qisqartmasi
   emas, aynan o'sha raqamlar.

   ⚠ Recharts KECHIKTIRIB yuklanadi (`lazy`). U ~100 KB gzip va panelning
   qolgan qismidan katta. Bosh sahifa ochilishi grafik yuklanishini kutmaydi:
   KPI qatori va "E'tibor talab qiladi" darhol chiziladi.
   ══════════════════════════════════════════════════════════════════════════ */

const Chart = lazy(() => import("./RevenueChartCanvas"));

/** "2026-08-06" → "06.08". Satr kesiladi, `new Date` EMAS: ISO sanani
 *  konstruktorga berish uni UTC yarim tuni deb o'qiydi va manfiy mintaqada
 *  bir kun orqaga suradi. */
const shortDay = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export default function RevenueChart({ data = [], toast }) {
  const { t } = useT();
  const [view, setView] = useState("chart");

  const hasAny = data.some((d) => Number(d.amount) > 0);
  const today  = data.length ? data[data.length - 1].day : null;

  const headers = [t("chart.day"), t("chart.income"), t("chart.paymentCount")];
  const rows    = data.map((d) => [d.day, d.amount, d.payments]);

  return (
    <div className="card">
      <div className="c-head">
        <span className="c-title">
          <i className="fa-solid fa-chart-column" aria-hidden="true" />
          {t("chart.income14d")}
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Ko'rinish tanlash — `tab` uslubi, panelning qolgan joyidagidek */}
          <div className="tabs" role="group">
            <button type="button"
                    className={`tab ${view === "chart" ? "on" : ""}`}
                    aria-pressed={view === "chart"}
                    aria-label={t("chart.viewChartAria")}
                    onClick={() => setView("chart")}>
              <i className="fa-solid fa-chart-column" aria-hidden="true" /> {t("chart.viewChart")}
            </button>
            <button type="button"
                    className={`tab ${view === "table" ? "on" : ""}`}
                    aria-pressed={view === "table"}
                    aria-label={t("chart.viewTableAria")}
                    onClick={() => setView("table")}>
              <i className="fa-solid fa-table-list" aria-hidden="true" /> {t("chart.viewTable")}
            </button>
          </div>
          <ExportButtons name="tushum-14-kun" headers={headers} rows={rows} toast={toast} />
        </div>
      </div>

      <div className="c-body">
        {!hasAny ? (
          <Empty icon="fa-chart-column" title={t("chart.empty")} />
        ) : view === "table" ? (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>{t("chart.day")}</th>
                  <th className="num">{t("chart.income")}</th>
                  <th className="num">{t("chart.paymentCount")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.day}>
                    <td className="ek-num">
                      {shortDay(d.day)}
                      {d.day === today && (
                        <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                          {t("chart.today")}
                        </span>
                      )}
                    </td>
                    <td className="ek-num" style={{ textAlign: "right" }}>{money(d.amount)}</td>
                    <td className="ek-num" style={{ textAlign: "right" }}>{groupDigits(d.payments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Yuklanish paytida joy BAND qilib turiladi (240px) — grafik
             kelganda sahifa sakramaydi. */
          <Suspense fallback={<div style={{ height: 240 }} aria-busy="true" />}>
            <Chart data={data} today={today} shortDay={shortDay} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
