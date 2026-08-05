import { LOGIN_URL, API_BASE, getDeviceId } from "../config";
import { getLang, withLang } from "../lib/ek-i18n";
import { authApi } from "../api";
import { useState, useEffect, useCallback } from "react";

// null yoki "null" string bo'lsa bo'sh qaytaradi
function ls(...keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v !== "null" && v !== "undefined" && v.trim()) return v;
  }
  return "";
}

/** localStorage'dagi shaxs — faqat ZAXIRA nusxa, haqiqat manbai emas. */
function cachedUser() {
  const token = ls("ek_token");
  const type  = ls("ek_type");
  if (!token || type !== "admin") return null;
  return {
    username: ls("ek_username", "ek_user") || "Admin",
    fullName: ls("ek_fullName", "ek_name") || "Admin",
    role:     ls("ek_role") || "SUPER_ADMIN",
  };
}

export function useAuth() {
  const [user,  setUser]  = useState(null);
  // Tekshiruv tugadimi. `user` ning o'zi yetarli emas: `null` ikki xil
  // ma'no berardi — "hali tekshirilmadi" va "kirish huquqi yo'q".
  const [ready, setReady] = useState(false);

  /* ── Panel yuklanishida SERVERDAN tasdiq (B9) ─────────────────────────────
     Ilgari bu hook faqat `localStorage` ni o'qirdi va shu bilan cheklanardi.
     Natijada:
       · bloklangan admin, tokeni amal qilgunicha, panelni ko'raverardi;
       · `ek_role` ni brauzer konsolidan o'zgartirib, o'ziga tegishli
         bo'lmagan bo'limlarni ochish mumkin edi (so'rovlar 403 bergani
         bilan, ko'rinish yolg'on bo'lardi).
     Endi rol va ism SERVER javobidan olinadi, saqlangan nusxa esa faqat
     tarmoq uzilganda ishlatiladi. */
  useEffect(() => {
    let alive = true;

    (async () => {
      const cached = cachedUser();
      // Token umuman yo'q — `App.jsx` modul tanasi allaqachon login'ga
      // yo'naltirgan, bu yerda kutishning ma'nosi yo'q.
      if (!cached) { if (alive) setReady(true); return; }

      try {
        const res  = await authApi.me();
        const data = res?.data || {};
        if (!alive) return;

        // Server bergan qiymat ustun. Saqlangan nusxa ham yangilanadi —
        // keyingi ochilishda va tarmoq uzilganda to'g'ri ism ko'rinsin.
        const fresh = {
          username: data.username || cached.username,
          fullName: data.fullName || data.username || cached.fullName,
          role:     data.role     || cached.role,
        };
        localStorage.setItem("ek_username", fresh.username);
        localStorage.setItem("ek_fullName", fresh.fullName);
        localStorage.setItem("ek_role",     fresh.role);
        setUser(fresh);
      } catch (err) {
        if (!alive) return;
        // 401 bo'lsa `api/index.js` allaqachon chiqarib yuborgan (`forceLogout`)
        // — bu yerga faqat tarmoq/server xatosi bilan kelinadi. Bunday holatda
        // chiqarib yuborish noto'g'ri bo'lardi: internet uzilgani uchun odamni
        // tizimdan haydash mumkin emas. Saqlangan nusxa bilan davom etamiz,
        // har qanday amalni baribir server tekshiradi.
        setUser(cached);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => { alive = false; };
  }, []);

  const logout = useCallback(async () => {
    // Refresh token serverda ham bekor qilinsin — aks holda u 30 kun
    // amal qilib turadi va "chiqish" faqat brauzerda ta'sir qiladi.
    const refresh = ls("ek_refresh");
    if (refresh) {
      try {
        await fetch(`${API_BASE}/auth/admin/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id":  getDeviceId(),
            "Accept-Language": getLang(),
            ...(ls("ek_token") ? { Authorization: `Bearer ${ls("ek_token")}` } : {}),
          },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      } catch (_) {
        // Tarmoq xatosi chiqishga to'sqinlik qilmasin
      }
    }

    ["ek_token","ek_type","ek_username","ek_fullName","ek_role",
     "ek_user","ek_name","ek_shop","ek_shopCode","ek_refresh","ek_deviceId",
     "adm_token","adm_user","adm_fullName","adm_role"
    ].forEach((k) => localStorage.removeItem(k));
    // `ek_lang` ro'yxatda YO'Q — til brauzerga tegishli, sessiyaga emas.
    // Baribir uzatamiz: kirish sahifasi boshqa origin.
    window.location.replace(withLang(`${LOGIN_URL}?logged_out=1`));
  }, []);

  return { user, ready, logout };
}
