import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Overlay from "./Overlay";
import { useT } from "../../lib/ek-i18n";
import { normSearch } from "../../lib/ek-search";
import { NAV, can } from "../../routes";

/* ══════════════════════════════════════════════════════════════════════════
   BUYRUQ QATORI — Ctrl+K (V75)

   ═══ NEGA KERAK ═════════════════════════════════════════════════════════

   Admin kunda o'nlab marta bir xil ishni qiladi: bir do'konni topish,
   bir xodimning holatini ko'rish, arizalarga o'tish. Har biri uchun
   menyuni ochish, bo'limga o'tish, sahifani kutish va yana qidirish
   kerak edi.

   ⚠ QIDIRUV MAHALLIY, SERVERGA SO'ROV YO'Q. Ilova panelida tovar va
   mijoz serverdan izlanadi (ular o'n minglab bo'lishi mumkin), bu
   yerda esa do'kon va xodim ro'yxati panel ochilishida allaqachon
   yuklangan va u yuzlab satrdan oshmaydi. Ular uchun so'rov yuborish
   javobni sekinlashtirardi va hech narsa qo'shmasdi.
   ══════════════════════════════════════════════════════════════════════════ */

const LIMIT = 6;

/** Menyudagi bandlar — ruxsatga qarab. */
function pagesFor(permissions, t) {
  const out = [];
  for (const group of NAV) {
    for (const item of group.items) {
      if (!can(permissions, item.perm)) continue;
      out.push({
        id: `page:${item.id}`,
        icon: item.icon || "fa-arrow-right",
        title: t(item.key),
        sub: t(group.sec),
        to: item.path,
      });
    }
  }
  return out;
}

/** Mahalliy ro'yxatdan tanlash — normalizatsiya `normSearch` da. */
function pick(list, q, limit = LIMIT) {
  if (!q) return list.slice(0, limit);
  const n = normSearch(q);
  return list.filter((x) => normSearch(`${x.title} ${x.sub || ""}`).includes(n)).slice(0, limit);
}

export default function CommandPalette({ open, onClose, permissions, shops = [], users = [] }) {
  const { t } = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const pages = useMemo(() => pagesFor(permissions, t), [permissions, t]);

  const shopRows = useMemo(() => shops.map((s) => ({
    id: `s:${s.id}`, icon: "fa-store", title: s.name,
    sub: s.code, to: `/shops?q=${encodeURIComponent(s.name || s.code || "")}`,
  })), [shops]);

  const userRows = useMemo(() => users.map((u) => ({
    id: `u:${u.id}`, icon: "fa-user", title: u.fullName || u.username,
    sub: u.shopName || u.username,
    to: `/users?q=${encodeURIComponent(u.fullName || u.username || "")}`,
  })), [users]);

  useEffect(() => {
    if (!open) return;
    setQ(""); setCursor(0);
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  const groups = useMemo(() => {
    const g = [];
    const p = pick(pages, q);
    if (p.length) g.push({ key: "pages", title: t("adm.dash.cmdPages"), items: p });
    /* Do'kon va xodim faqat YOZILGANDA chiqadi: bo'sh maydonda
       yuzta satr ko'rsatish oynani ro'yxatga aylantirardi. */
    if (q.trim().length >= 2) {
      const s = pick(shopRows, q);
      if (s.length) g.push({ key: "shops", title: t("adm.dash.cmdShops"), items: s });
      const u = pick(userRows, q);
      if (u.length) g.push({ key: "users", title: t("adm.dash.cmdUsers"), items: u });
    }
    return g;
  }, [pages, shopRows, userRows, q, t]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  /* Ro'yxat qisqarganda kursor tashqarida qolmasin. */
  useEffect(() => { setCursor((c) => Math.min(c, Math.max(0, flat.length - 1))); }, [flat.length]);

  const go = (item) => { if (!item) return; onClose(); navigate(item.to); };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(flat[cursor]); }
  };

  if (!open) return null;

  let idx = -1;
  return (
    <Overlay className="cmd__back" onEscape={onClose}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label={t("adm.dash.cmdTitle")}>
        <div className="cmd__head">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd__input"
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={onKey}
            placeholder={t("adm.dash.cmdPlaceholder")}
            aria-label={t("adm.dash.cmdPlaceholder")}
          />
          <button type="button" className="cmd__x" onClick={onClose} aria-label={t("common.close")}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="cmd__body">
          {flat.length === 0 ? (
            <div className="cmd__empty">{t("adm.dash.cmdEmpty")}</div>
          ) : groups.map((g) => (
            <div key={g.key} className="cmd__group">
              <div className="cmd__gtitle">{g.title}</div>
              {g.items.map((it) => {
                idx++;
                const my = idx;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`cmd__row${my === cursor ? " is-active" : ""}`}
                    onMouseEnter={() => setCursor(my)}
                    onClick={() => go(it)}
                  >
                    <i className={`fa-solid ${it.icon}`} aria-hidden="true" />
                    <span className="cmd__t">{it.title}</span>
                    {it.sub && <span className="cmd__s">{it.sub}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cmd__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t("adm.dash.cmdMove")}</span>
          <span><kbd>Enter</kbd> {t("adm.dash.cmdOpen")}</span>
          <span><kbd>Esc</kbd> {t("common.close")}</span>
        </div>
      </div>
    </Overlay>
  );
}
