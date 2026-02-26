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

  const logout = useCallback(() => {
    ["ek_token","ek_type","ek_username","ek_fullName","ek_role",
     "ek_user","ek_name","ek_shop","ek_shopCode","ek_refresh","ek_deviceId",
     "adm_token","adm_user","adm_fullName","adm_role"
    ].forEach((k) => localStorage.removeItem(k));
    window.location.replace("http://localhost:5175?logged_out=1");
  }, []);

  return { user, logout };
}
