import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useT } from "../lib/ek-i18n";
import { money, groupDigits } from "../lib/ek-format";

/* ══════════════════════════════════════════════════════════════════════════
   Recharts kanvasi — ALOHIDA fayl, chunki `RevenueChart` uni `lazy` bilan
   yuklaydi. Import shu faylda turgani uchun Recharts alohida bo'lakka
   ajraladi va bosh sahifa ochilishini kechiktirmaydi.

   07-ADMIN.md qoidalari:
     · bitta grafikda 6 tadan ko'p rang bo'lmaydi — bu yerda IKKITA
       (brend ko'ki va bugungi ustun uchun urg'u);
     · o'q raqamlari `.ek-num`;
     · tooltip'da TO'LIQ summa (qisqartirilmagan).
   ══════════════════════════════════════════════════════════════════════════ */

const REDUCED = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** O'q uchun qisqartma: 1 250 000 → "1.3 mln". Tooltip'da to'liq summa qoladi. */
function axisMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + " mlrd";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + " mln";
  if (v >= 1_000)         return Math.round(v / 1_000) + " ming";
  return groupDigits(v);
}

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="ek-dialog" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--r-lg)", padding: "10px 12px", boxShadow: "var(--sh-lg)",
    }}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>{label}</div>
      {/* To'liq summa — qisqartirilmagan (07-ADMIN.md) */}
      <div className="ek-num" style={{ fontSize: 13, fontWeight: 700 }}>
        {money(row.revenue, { withUnit: true })}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
        {t("chart.salesCount")}: <span className="ek-num">{groupDigits(row.sales)}</span>
      </div>
    </div>
  );
}

export default function RevenueChartCanvas({ data, today, shortDay }) {
  const { t } = useT();
  const rows = data.map((d) => ({ ...d, label: shortDay(d.day) }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false}
               tick={{ fill: "var(--fg-tertiary)", fontSize: 11 }}
               className="ek-num" />
        <YAxis tickFormatter={axisMoney} tickLine={false} axisLine={false} width={64}
               tick={{ fill: "var(--fg-tertiary)", fontSize: 11 }}
               className="ek-num" />
        <Tooltip content={(props) => <ChartTooltip {...props} t={t} />}
                 cursor={{ fill: "var(--bg-sunken)" }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}
             isAnimationActive={!REDUCED()} animationDuration={420}>
          {rows.map((row) => (
            /* Bugungi ustun ajratilgan (07-ADMIN.md). Rang YOLG'IZ signal
               emas — jadval ko'rinishida o'sha kun "Bugun" yorlig'ini oladi. */
            <Cell key={row.day}
                  fill={row.day === today ? "var(--ek-green-400)" : "var(--bg-brand)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
