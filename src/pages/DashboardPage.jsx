import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shopApi, userApi, contactApi, backupApi } from "../api";
import { fmtDate, SHOP_STATUS, shopStatus, money } from "../utils";
import { percent, time } from "../lib/ek-format";
import { useT } from "../lib/ek-i18n";
import { SkeletonTable } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";
import { Badge } from "../components/ui";
import { CountUp, Sparkline } from "../components/ek/Kpi";
import { LineChart, shortNum } from "../components/ek/Charts";
import CommandPalette from "../components/ek/CommandPalette";
import Modal from "../components/Modal";
import { can } from "../routes";
import {
  buildAlerts, countBySeverity, changes, healthCounts, shopState, stateTone,
  readLayout, saveLayout, move, toggle,
} from "../lib/ek-dash";

/* ══════════════════════════════════════════════════════════════════════════
   SUPERADMIN BOSH SAHIFASI — boshqaruv paneli (V75)

   ═══ EKRAN NIMA UCHUN BOR ═══════════════════════════════════════════════

   «Kassir paneli tezlik uchun. Bu panel TUSHUNISH uchun.» Bitta savol:
   tizimda bugun nima e'tibor talab qiladi va o'tgan oyga nisbatan nima
   o'zgardi?

   ⚠ ILOVA PANELI BILAN BIR XIL TUZILISH, BOSHQA MA'LUMOT. Bloklar,
   ogohlantirishlar markazi, «nima o'zgardi», Ctrl+K va bloklarni
   sozlash — hammasi bir xil ishlaydi, chunki ikkala panelni ishlatadigan
   odam bitta. Lekin raqamlar butunlay boshqa: u yerda do'konning
   savdosi, bu yerda BIZNING mijozlarimiz.

   ⚠ DO'KON AYLANMASI BU YERDA YO'Q va bo'lmaydi ham
   (`ShopPrivacyPolicy`): do'kon aylanmasini bizga ishonib topshirmagan,
   u kassa dasturidan foydalanadi. Bizning ko'rsatkichimiz — obuna
   tushumi va do'konning ISHLAYOTGANI (sotuvlar soni), summasi emas.

   ⚠ AVTO-YANGILANISH ILOVA KO'RINMAGANDA TO'XTAYDI. Ochiq qolgan va
   hech kim qaramaydigan varaq kechasi ham so'rov yuborardi.
   ══════════════════════════════════════════════════════════════════════════ */

/** Avto-yangilanish oralig'i — panel jonli emas, uch daqiqa yetadi. */
const REFRESH_MS = 180_000;

/* ══════════════════════════════════════════════════════════════════════
   KICHIK BO'LAKLAR
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Izoh belgisi — FORMULANI aytadi.
 *
 * ⚠ Shrift ikonkasi EMAS, CSS bilan chizilgan: Font Awesome tashqi
 * manbadan keladi va u yuklanmaganda joyida bo'sh to'rtburchak qolardi.
 */
function Hint({ text }) {
  if (!text) return null;
  return (
    <button type="button" className="kpi__hint" title={text} aria-label={text}
            onClick={(e) => e.currentTarget.focus()}>i</button>
  );
}

/** O'zgarish ko'rsatkichi. `good` — o'sish yaxshimi. */
function Delta({ pct, good = "up", small }) {
  const { t } = useT();
  if (pct == null || !Number.isFinite(pct)) return null;
  const up = pct > 0;
  const tone = (up === (good === "up")) ? "good" : "bad";
  if (Math.abs(pct) < 0.05) {
    return <span className={`dlt${small ? " dlt--s" : ""}`} data-tone="flat">= {t("adm.dash.same")}</span>;
  }
  return (
    <span className={`dlt${small ? " dlt--s" : ""}`} data-tone={tone}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

/** Panel — sarlavha, izoh, o'ng tarafdagi amal va tanasi. */
function Panel({ title, icon, hint, right, children, onTitleClick }) {
  return (
    <section className="dpn">
      <header className="dpn__h">
        <h3 className="dpn__t">
          {icon && <i className={`fa-solid ${icon}`} aria-hidden="true" />}
          {onTitleClick
            ? <button type="button" className="dpn__link" onClick={onTitleClick}>{title}</button>
            : title}
          <Hint text={hint} />
        </h3>
        {right}
      </header>
      <div className="dpn__b">{children}</div>
    </section>
  );
}

/**
 * KPI kartochkasi — raqam, o'zgarish va DRILL-DOWN.
 *
 * ⚠ Bosilganda avval PASTDA kichik tafsilot ochiladi, sahifa
 * almashmaydi: admin ko'pincha «nega shunday?» degan savolga bir
 * qatorlik javob bilan qanoatlanadi.
 */
function Kpi2({ label, value, format, delta, good, spark, hint, tone, detail, onOpen }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const can2 = Boolean(detail || onOpen);

  return (
    <div className={`kpi2${can2 ? " is-click" : ""}`} data-tone={tone || undefined}>
      {/* ⚠ Yorliq va izoh tugmadan TASHQARIDA: izoh ham tugma va
          tugma ichidagi tugma klaviatura hamda skrinrider uchun
          buziq tuzilma. */}
      <span className="kpi2__l">{label}<Hint text={hint} /></span>
      <button type="button" className="kpi2__hit" aria-label={label}
              onClick={can2 ? () => setOpen((v) => !v) : undefined}
              aria-expanded={can2 ? open : undefined} disabled={!can2}>
        <span className="kpi2__v ek-num">
          <CountUp value={Number(value) || 0} format={format} />
        </span>
        <span className="kpi2__f">
          <Delta pct={delta} good={good} small />
          {spark?.length > 1 && <Sparkline data={spark} width={70} height={20} />}
        </span>
      </button>

      {open && (
        <div className="kpi2__d">
          {detail}
          {onOpen && (
            <button type="button" className="kpi2__more" onClick={onOpen}>
              {t("adm.dash.drill")} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Bir qatorlik «nom — qiymat» tafsiloti. */
function Line({ label, value, tone }) {
  return (
    <div className="kpi2__row">
      <span>{label}</span>
      <span className="ek-num" data-tone={tone || undefined}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   OGOHLANTIRISHLAR MARKAZI
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Muhimlik bo'yicha guruhlangan ro'yxat.
 *
 * ⚠ Sarlavhada MUHIMLIK SANOG'I turadi, umumiy son emas. «7 ta
 * ogohlantirish» degani hech narsani anglatmasdi: yettitasi ham mayda
 * bo'lishi mumkin edi.
 */
function Alerts({ alerts, loading, onGo }) {
  const { t } = useT();
  const [all, setAll] = useState(false);
  const cnt = countBySeverity(alerts);
  const SHOW = 6;
  const shown = all ? alerts : alerts.slice(0, SHOW);

  return (
    <Panel
      title={t("attention.title")}
      icon="fa-bell"
      hint={t("adm.dash.hintAlerts")}
      right={
        <div className="alr__sum">
          {cnt.critical > 0 && <span className="alr__chip" data-tone="critical">{cnt.critical}</span>}
          {cnt.warning > 0 && <span className="alr__chip" data-tone="warning">{cnt.warning}</span>}
          {cnt.info > 0 && <span className="alr__chip" data-tone="info">{cnt.info}</span>}
        </div>
      }
    >
      {loading ? (
        <div className="alr__list">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="ek-skeleton" style={{ height: 44, borderRadius: 10 }} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="attn__empty">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          {t("attention.empty")}
        </div>
      ) : (
        <>
          <div className="alr__list">
            {shown.map((a) => (
              <button key={a.id} type="button" className="alr__row" data-tone={a.severity}
                      onClick={() => onGo(a.to)}>
                <span className="alr__ico"><i className={`fa-solid ${a.icon}`} aria-hidden="true" /></span>
                <span className="alr__txt">{t(a.key, a.args)}</span>
                {a.count != null && <span className="alr__val ek-num">{a.count}</span>}
                <i className="fa-solid fa-chevron-right alr__go" aria-hidden="true" />
              </button>
            ))}
          </div>
          {alerts.length > SHOW && (
            <button type="button" className="dpn__more" onClick={() => setAll((v) => !v)}>
              {all ? t("adm.dash.less") : t("adm.dash.moreN", { n: alerts.length - SHOW })}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   OBUNA TUSHUMI
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Kunlik obuna tushumi.
 *
 * ⚠ Chiziq, ustun EMAS. Ustunlar kunlik to'lovlarni «har kuni bir xil
 * bo'lishi kerak» degan taassurot berardi, holbuki obuna to'lovi
 * to'plam bo'lib keladi: ba'zi kunlar nol, ba'zilarida o'nlab.
 * Chiziqda esa yig'ilish tabiiy ko'rinadi.
 */
function IncomePanel({ stats, loading, onGo }) {
  const { t } = useT();
  const daily = stats?.daily || [];
  const points = daily.map((d) => ({ label: (d.day || "").slice(5), income: Number(d.amount) || 0 }));
  const total = points.reduce((a, p) => a + p.income, 0);

  /* ⚠ SARLAVHADAGI SUMMA GRAFIKNIKI, KPI NIKI EMAS va u shunday
     YOZILADI. Grafik oxirgi 14 kunni chizadi, yuqoridagi kartochka esa
     30 kunlik tushumni ko'rsatadi. Ikkalasi bir xil «Obuna tushumi»
     deb yozilganda yonma-yon turgan ikki xil raqam chiqib, qaysi biri
     to'g'ri ekani noma'lum bo'lib qolardi. */
  return (
    <Panel title={t("adm.dash.wIncome")} icon="fa-money-bill-trend-up"
           hint={t("adm.dash.hintIncome")}
           onTitleClick={() => onGo("/shops")}
           right={points.length > 0 && (
             <span className="dpn__sum">
               <span className="dpn__sumlbl">{t("adm.dash.lastNDays", { n: points.length })}</span>
               <b className="ek-num">{money(total)}</b>
             </span>
           )}>
      {loading ? <span className="ek-skeleton" style={{ height: 200 }} /> : (
        <LineChart
          points={points}
          lines={[{ key: "income", label: t("adm.dash.wIncome"), color: "var(--bg-brand)", area: true }]}
          height={210}
          fmt={shortNum}
          empty={t("common.noData")}
        />
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   NIMA O'ZGARDI
   ══════════════════════════════════════════════════════════════════════ */

function ChangesPanel({ stats, loading }) {
  const { t } = useT();
  const list = useMemo(() => changes(stats), [stats]);

  return (
    <Panel title={t("adm.dash.wChanges")} icon="fa-lightbulb" hint={t("adm.dash.hintChanged")}>
      {loading ? <span className="ek-skeleton" style={{ height: 90 }} />
       : list.length === 0 ? <div className="pln__none">{t("adm.dash.noChanges")}</div>
       : (
        <div className="chg">
          {list.map((c) => (
            <div key={c.key} className="chg__row" data-tone={c.tone}>
              <i className={`fa-solid ${c.dir === "up" ? "fa-arrow-trend-up" : "fa-arrow-trend-down"}`}
                 aria-hidden="true" />
              <span className="chg__t">{t(`adm.dash.chg.${c.key}`)}</span>
              <b className="ek-num chg__v">
                {c.pct > 0 ? "+" : "−"}{Math.abs(c.pct).toFixed(0)}%
              </b>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DO'KONLAR HOLATI
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Do'konlar to'rtta holatga ajratiladi.
 *
 * ⚠ «Ishlayapti» va «ro'yxatda bor» — boshqa-boshqa narsa. Qirq do'kon
 * ro'yxatda turib sakkiztasi ishlayotgan bo'lishi mumkin va bu
 * butunlay boshqa biznes holati. Ilgari panel faqat ro'yxat uzunligini
 * ko'rsatardi.
 */
function HealthPanel({ stats, loading, onGo }) {
  const { t } = useT();
  const rows = stats?.shops || [];
  const c = useMemo(() => healthCounts(rows), [rows]);
  const total = rows.length || 1;

  const CELLS = [
    { key: "live", n: c.live },
    { key: "quiet", n: c.quiet },
    { key: "abandoned", n: c.abandoned },
    { key: "never", n: c.never },
  ];

  return (
    <Panel title={t("adm.dash.wHealth")} icon="fa-heart-pulse" hint={t("adm.dash.hintHealth")}
           onTitleClick={() => onGo("/shops")}>
      {loading ? <span className="ek-skeleton" style={{ height: 120 }} /> : (
        <>
          <div className="stk__row">
            {CELLS.map((x) => (
              <button key={x.key} type="button" className="stk__c"
                      data-tone={stateTone(x.key) === "good" ? undefined : stateTone(x.key)}
                      onClick={() => onGo("/shops")}>
                <b className="ek-num">{x.n}</b>
                <span>{t(`adm.dash.state.${x.key}`)}</span>
              </button>
            ))}
          </div>
          {/* Bitta chiziqda ulushlar — raqamlar yonida nisbat ham ko'rinsin. */}
          <div className="hlt__bar" role="img"
               aria-label={CELLS.map((x) => `${t(`adm.dash.state.${x.key}`)}: ${x.n}`).join(", ")}>
            {CELLS.filter((x) => x.n > 0).map((x) => (
              <span key={x.key} data-tone={stateTone(x.key)}
                    style={{ width: `${(x.n / total) * 100}%` }}
                    title={`${t(`adm.dash.state.${x.key}`)} — ${percent((x.n / total) * 100)}`} />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DO'KONLAR RO'YXATI
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Oxirgi do'konlar.
 *
 * ⚠ Har satrda HOLAT NUQTASI bor — «ishlayaptimi?» degan savolga
 * javob. Ilgari jadvalda faqat ma'muriy holat (ACTIVE/BLOCKED)
 * turardi va ACTIVE do'kon olti oydan beri hech narsa sotmagan
 * bo'lishi mumkin edi.
 */
function ShopsPanel({ shops, stats, loading, busy, onGo }) {
  const { t } = useT();
  const byId = useMemo(() => {
    const m = new Map();
    for (const r of stats?.shops || []) m.set(r.shopId, r);
    return m;
  }, [stats]);

  return (
    <Panel title={t("adm.dash.shops")} icon="fa-store"
           onTitleClick={() => onGo("/shops")}
           right={
             <button className="btn btn-outline btn-sm" onClick={() => onGo("/shops")}>
               {t("adm.dash.seeAll")} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
             </button>
           }>
      <div className="tw">
        {busy || loading ? <SkeletonTable rows={6} cols={["wide", "text", "text", "narrow", "text"]} /> : (
          <table>
            <thead>
              <tr>
                <th>{t("adm.shops.colShop")}</th>
                <th>{t("adm.shops.colCode")}</th>
                <th>{t("adm.shops.colOwner")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.date")}</th>
              </tr>
            </thead>
            <tbody>
              {shops.slice(0, 8).map((shop) => {
                const st = { ...shopStatus(shop.status), color: SHOP_STATUS[shop.status]?.color || "gray" };
                const state = shopState(byId.get(shop.id));
                return (
                  <tr key={shop.id}>
                    <td style={{ fontWeight: 700 }}>
                      <span className="brn__dot" data-tone={stateTone(state)}
                            title={t(`adm.dash.state.${state}`)} aria-hidden="true" />
                      {shop.name}
                    </td>
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
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ARIZALAR
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Javobsiz arizalar.
 *
 * ⚠ SPAM «yangi» deb sanalmaydi — bu qoida bir marta buzilgan va
 * panel «3 ta yangi ariza» deb turgan paytda bo'limda hech narsa
 * yo'q edi. Ikkala ekran bir xil qoidaga bo'ysunishi shart.
 */
function RequestsPanel({ requests, loading, onGo }) {
  const { t } = useT();
  const status = (r) => r.status || (r.handled ? "HANDLED" : "NEW");
  const rows = useMemo(
    () => (requests || []).filter((r) => status(r) === "NEW").slice(0, 6), [requests]);

  return (
    <Panel title={t("adm.dash.wRequests")} icon="fa-inbox"
           onTitleClick={() => onGo("/requests")}>
      {loading ? <span className="ek-skeleton" style={{ height: 100 }} />
       : rows.length === 0 ? <div className="pln__none">{t("adm.dash.noNewRequests")}</div>
       : (
        <div className="dtop">
          {rows.map((r) => (
            <button key={r.id} type="button" className="dtop__row" onClick={() => onGo("/requests")}>
              <i className="fa-solid fa-user dtop__n" aria-hidden="true" />
              <span className="dtop__name">
                {r.name || r.phone}
                {r.phone && r.name && <span className="dtop__sub">{r.phone}</span>}
              </span>
              <span className="dtop__v ek-num">{fmtDate(r.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TEZKOR AMALLAR
   ══════════════════════════════════════════════════════════════════════ */

function ActionsPanel({ permissions, onGo }) {
  const { t } = useT();
  const acts = [
    can(permissions, "CONTACT_VIEW") && { id: "req", icon: "fa-inbox", key: "nav.requests", to: "/requests" },
    can(permissions, "SHOP_VIEW") && { id: "shops", icon: "fa-store", key: "nav.shops", to: "/shops" },
    can(permissions, "SHOP_USER_VIEW") && { id: "users", icon: "fa-users", key: "nav.users", to: "/users" },
    can(permissions, "AUDIT_VIEW") && { id: "audit", icon: "fa-clipboard-list", key: "nav.audit", to: "/audit" },
    { id: "settings", icon: "fa-gear", key: "nav.settings", to: "/settings" },
  ].filter(Boolean);

  return (
    <Panel title={t("adm.dash.wActions")} icon="fa-bolt">
      <div className="qa">
        {acts.map((a) => (
          <button key={a.id} type="button" className="qa__b" onClick={() => onGo(a.to)}>
            <i className={`fa-solid ${a.icon}`} aria-hidden="true" />
            <span>{t(a.key)}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   BLOKLARNI SOZLASH
   ══════════════════════════════════════════════════════════════════════ */

/**
 * ⚠ Sudrab ko'chirish O'RNIGA tugmalar: sudrash klaviatura bilan
 * qilib bo'lmaydi va skrinrider uchun ko'rinmas.
 */
function LayoutModal({ open, onClose, list, setList }) {
  const { t } = useT();
  if (!open) return null;
  const apply = (next) => { setList(next); saveLayout(next); };

  return (
    <Modal onClose={onClose} title={t("adm.dash.customize")} size="sm">
      <p className="lay__hint">{t("adm.dash.customizeHint")}</p>
      <div className="lay">
        {list.map((w, i) => (
          <div key={w.id} className="lay__row">
            <label className="lay__on">
              <input type="checkbox" checked={w.on} onChange={() => apply(toggle(list, w.id))} />
              <span>{t(w.key)}</span>
            </label>
            <span className="lay__mv">
              <button type="button" disabled={i === 0} onClick={() => apply(move(list, w.id, -1))}
                      aria-label={t("adm.dash.moveUp")}>
                <i className="fa-solid fa-chevron-up" aria-hidden="true" />
              </button>
              <button type="button" disabled={i === list.length - 1} onClick={() => apply(move(list, w.id, 1))}
                      aria-label={t("adm.dash.moveDown")}>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SAHIFA
   ══════════════════════════════════════════════════════════════════════ */

export default function DashboardPage({ toast, user }) {
  const { t } = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const permissions = user?.permissions ?? null;

  const [shops, setShops] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [backup, setBackup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [at, setAt] = useState(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layout, setLayout] = useState(() => readLayout((p) => can(permissions, p)));
  const busy = useLoading(loading);

  /* Ruxsat kech kelsa (server javobi) ro'yxat qayta quriladi. */
  useEffect(() => {
    setLayout(readLayout((p) => can(permissions, p)));
  }, [permissions]);

  /* ── Yuklash ──────────────────────────────────────────────────────
     ⚠ `allSettled`, `all` EMAS: beshta mustaqil manba bor va bittasi
     yiqilsa qolganlari ko'rinmay qolishi noto'g'ri bo'lardi.

     ⚠ Xato JIMGINA yutilmaydi: ilgari `.catch(() => ({data:[]}))`
     tufayli foydalanuvchi bo'sh, «hammasi joyida» ko'rinishdagi
     panelni ko'rardi va nimadir ishlamayotganini bilmasdi.

     ⚠ Avto-yangilanishda esa xabar CHIQMAYDI (`quiet`): har uch
     daqiqada takrorlanadigan toast panelni ishlatib bo'lmas holga
     keltirardi. */
  const load = useCallback((quiet) => {
    if (!quiet) setLoading(true);
    return Promise.allSettled([
      shopApi.getAll(), userApi.getAll(), contactApi.getAll(),
      shopApi.stats(), backupApi.status(),
    ]).then((res) => {
      const [s, u, c, st, bk] = res;
      if (s.status === "fulfilled") setShops(s.value?.data || []);
      if (u.status === "fulfilled") setUsers(u.value?.data || []);
      if (c.status === "fulfilled") setRequests(c.value?.data || []);
      if (st.status === "fulfilled") setStats(st.value?.data || null);
      if (bk.status === "fulfilled") setBackup(bk.value?.data || null);
      setAt(new Date());

      const failed = res.filter((r) => r.status === "rejected");
      if (failed.length && !quiet) {
        toast?.error?.(`${t("common.loadFailed")}: ${failed[0].reason?.message || ""}`);
      }
    }).finally(() => setLoading(false));
  }, [toast, t]);

  useEffect(() => { load(false); }, [load]);

  /* ⚠ Ko'rinmayotgan varaqda yangilanish TO'XTAYDI; varaq qaytganda
     esa DARHOL yangilanadi — eski raqamni ko'rsatib turish yomonroq. */
  useEffect(() => {
    let id = null;
    const stop = () => { if (id) clearInterval(id); id = null; };
    const start = () => { stop(); id = setInterval(() => load(true), REFRESH_MS); };
    const onVis = () => {
      if (document.hidden) stop();
      else { load(true); start(); }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  /* ── Ctrl+K ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback((to) => { if (to) navigate(to); }, [navigate]);

  /* ── Ogohlantirishlar ─────────────────────────────────────────────
     Butun tizimdan kelgan signallar bitta tartiblangan ro'yxatda —
     mantiq `ek-dash.js` da, chunki u SINALADIGAN qaror. */
  const alerts = useMemo(
    () => buildAlerts({ stats, backup, shops, users }), [stats, backup, shops, users]);

  /* ── KPI ──────────────────────────────────────────────────────────
     ⚠ `delta` endi HAQIQIY: avvalgi 30 kun serverdan keladi (V75).
     Ilgari bu yerda `aktiv/jami*100-100` turardi va 4 tadan 3 tasi
     aktiv bo'lsa «−25% pasayish» deb ko'rsatardi. */
  const prev = stats?.prev;
  const pct = (a, b) => (Number(b) ? ((Number(a) - Number(b)) / Math.abs(Number(b))) * 100 : null);
  const spark = useMemo(
    () => (stats?.daily || []).map((d) => Number(d.amount) || 0), [stats]);

  const health = useMemo(() => healthCounts(stats?.shops || []), [stats]);
  const totalShops = stats?.totalShops ?? shops.length;
  const activeShops = stats?.activeShops30d ?? shops.filter((s) => s.status === "ACTIVE").length;
  const newRequests = stats?.newRequests
    ?? requests.filter((r) => (r.status || (r.handled ? "HANDLED" : "NEW")) === "NEW").length;

  const RENDER = {
    kpi: () => (
      <div className="kpi2row" key="kpi">
        <Kpi2 label={t("adm.dash.activeShops30d")} value={activeShops}
              format={(v) => String(v)} hint={t("adm.dash.activeHint")}
              delta={pct(activeShops, prev?.activeShops)}
              onOpen={() => go("/shops")}
              detail={<>
                <Line label={t("adm.dash.ofTotal", { n: totalShops })}
                      value={percent(totalShops ? (activeShops / totalShops) * 100 : 0)} />
                <Line label={t("adm.dash.state.abandoned")} value={health.abandoned}
                      tone={health.abandoned ? "bad" : undefined} />
                <Line label={t("adm.dash.state.never")} value={health.never} />
              </>} />
        <Kpi2 label={t("adm.dash.subscriptionIncome30d")}
              value={stats?.subscriptionIncome30d ?? 0} format={money}
              hint={t("adm.dash.hintIncome")} spark={spark}
              delta={pct(stats?.subscriptionIncome30d, prev?.subscriptionIncome)}
              onOpen={() => go("/shops")} />
        <Kpi2 label={t("adm.dash.newRequests")} value={newRequests} format={(v) => String(v)}
              tone={newRequests > 0 ? "bad" : undefined}
              onOpen={() => go("/requests")} />
        <Kpi2 label={t("adm.dash.newShops")} value={stats?.newShops30d ?? 0} format={(v) => String(v)}
              delta={pct(stats?.newShops30d, prev?.newShops)}
              onOpen={() => go("/shops")}
              detail={<Line label={t("adm.dash.totalShops")} value={totalShops} />} />
      </div>
    ),
    alerts: () => <Alerts key="alerts" alerts={alerts} loading={busy} onGo={go} />,
    income: () => <IncomePanel key="income" stats={stats} loading={busy} onGo={go} />,
    changes: () => <ChangesPanel key="changes" stats={stats} loading={busy} />,
    health: () => <HealthPanel key="health" stats={stats} loading={busy} onGo={go} />,
    shops: () => <ShopsPanel key="shops" shops={shops} stats={stats} loading={loading} busy={busy} onGo={go} />,
    requests: () => <RequestsPanel key="requests" requests={requests} loading={busy} onGo={go} />,
    actions: () => <ActionsPanel key="actions" permissions={permissions} onGo={go} />,
  };

  /* Yonma-yon tushadigan bloklar — keng ekranda joy tejaladi. */
  const NARROW = new Set(["changes", "health", "requests", "actions"]);
  const blocks = layout.filter((w) => w.on && RENDER[w.id]);
  const rows = [];
  for (const w of blocks) {
    const last = rows[rows.length - 1];
    if (NARROW.has(w.id) && last?.narrow && last.items.length < 2) last.items.push(w);
    else rows.push({ narrow: NARROW.has(w.id), items: [w] });
  }

  return (
    <div className="dash">
      {/* ══ Boshqaruv qatori ══════════════════════════════════════════ */}
      <div className="dash__bar">
        <div className="dash__left">
          <h2 className="page-title">{t("nav.dashboard")}</h2>
          <span className="dash__period">{t("adm.dash.last30")}</span>
        </div>

        <div className="dash__ctl">
          <button type="button" className="dash__search" onClick={() => setCmdOpen(true)}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <span>{t("adm.dash.searchAll")}</span>
            <kbd>Ctrl</kbd><kbd>K</kbd>
          </button>
          <button type="button" className="dash__icon" onClick={() => load(false)}
                  aria-label={t("adm.dash.refresh")} title={t("adm.dash.refresh")}>
            <i className="fa-solid fa-rotate" aria-hidden="true" />
          </button>
          <button type="button" className="dash__icon" onClick={() => setLayoutOpen(true)}
                  aria-label={t("adm.dash.customize")} title={t("adm.dash.customize")}>
            <i className="fa-solid fa-sliders" aria-hidden="true" />
          </button>
        </div>
      </div>

      {at && (
        <div className="dash__at">
          <span className="live__dot" aria-hidden="true" />
          {t("adm.dash.updatedAt", { v: time(at.toISOString()) })}
        </div>
      )}

      {rows.map((r, i) => (
        r.narrow && r.items.length > 1
          ? <div className="dash__two" key={i}>{r.items.map((w) => RENDER[w.id]())}</div>
          : <div key={i}>{r.items.map((w) => RENDER[w.id]())}</div>
      ))}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)}
                      permissions={permissions} shops={shops} users={users} />
      <LayoutModal open={layoutOpen} onClose={() => setLayoutOpen(false)}
                   list={layout} setList={setLayout} />
    </div>
  );
}
