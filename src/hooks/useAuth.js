import { LOGIN_URL, API_BASE, getDeviceId } from "../config";
import { useState, useCallback } from "react";

// null yoki "null" string bo'lsa bo'sh qaytaradi
function ls(...keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v !== "null" && v !== "undefined" && v.trim()) return v;
  }
  return "";
}

export function useAuth() {
  const [user] = useState(() => {
    const token = ls("ek_token");
    const type  = ls("ek_type");
    if (!token || type !== "admin") return null;
    return {
      username: ls("ek_username", "ek_user") || "Admin",
      fullName: ls("ek_fullName", "ek_name") || "Admin",
      role:     ls("ek_role") || "SUPER_ADMIN",
    };
  });

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
    window.location.replace(`${LOGIN_URL}?logged_out=1`);
  }, []);

  return { user, logout };
}
