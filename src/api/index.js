import { API_BASE as API, LOGIN_URL, getDeviceId } from "../config";
import { getLang, withLang } from "../lib/ek-i18n";

// Bir vaqtda bir nechta so'rov 401 olsa, refresh faqat bir marta yuborilsin
let refreshPromise = null;

async function tryRefreshToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refresh = localStorage.getItem("ek_refresh");
      if (!refresh || refresh === "null" || refresh === "undefined") return false;

      // `credentials: include` — refresh token httpOnly cookie'da keladi (05-AUTH.md)
      const res = await fetch(`${API}/auth/admin/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept":       "application/json",
          "X-Device-Id":  getDeviceId(),
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) return false;

      const json = await res.json().catch(() => ({}));
      if (!json.success || !json?.data?.accessToken) return false;

      localStorage.setItem("ek_token",   json.data.accessToken);
      localStorage.setItem("ek_refresh", json.data.refreshToken || refresh);
      return true;
    } catch (_) {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function forceLogout() {
  localStorage.clear();
  // Til kirish ekraniga ham o'tsin: originlar turli, localStorage bo'linmaydi
  window.location.replace(withLang(`${LOGIN_URL}?logged_out=1`));
  throw new Error("AUTH_FAILED");
}

async function req(path, options = {}, _retry = false) {
  const token = localStorage.getItem("ek_token");
  const { headers: extra, ...rest } = options;

  const res = await fetch(`${API}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type":    "application/json",
      // Backend xato xabarlari foydalanuvchi tilida kelsin
      "Accept-Language": getLang(),
      "X-Device-Id":     getDeviceId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra || {}),
    },
  });

  if (res.status === 401) {
    // Login/refresh ning o'zi 401 bersa — bu haqiqiy xato, qayta urinmaymiz
    if (path.includes("/auth/admin/login") || path.includes("/auth/admin/refresh")) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || `Xatolik ${res.status}`);
    }

    if (_retry) forceLogout();

    const refreshed = await tryRefreshToken();
    if (!refreshed) forceLogout();

    return req(path, options, true);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Xatolik ${res.status}`);
  return json;
}
const body = (data) => ({ body: JSON.stringify(data) });

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login:  (data) => req("/auth/admin/login", { method: "POST", ...body(data) }),
  me:     ()     => req("/auth/admin/me"),
  logout: ()     => req("/auth/admin/logout", {
    method: "POST",
    ...body({ refreshToken: localStorage.getItem("ek_refresh") || "" }),
  }),
};

// ── Do'konlar ───────────────────────────────────────────────────
export const shopApi = {
  getAll:  ()         => req("/superadmin/shops"),
  getById: (id)       => req(`/superadmin/shops/${id}`),
  create:  (data)     => req("/superadmin/shops",       { method: "POST",   ...body(data) }),
  update:  (id, data) => req(`/superadmin/shops/${id}`, { method: "PUT",    ...body(data) }),
  delete:  (id)       => req(`/superadmin/shops/${id}`, { method: "DELETE" }),
  setStatus: (id, status) => req(`/superadmin/shops/${id}/status`, { method: "PATCH", ...body({ status }) }),
};

// ── Foydalanuvchilar ────────────────────────────────────────────
export const userApi = {
  getAll:      ()               => req("/superadmin/users"),
  getByShop:   (shopId)         => req(`/superadmin/shops/${shopId}/users`),
  create:      (shopId, data)   => req(`/superadmin/shops/${shopId}/users`,              { method: "POST",  ...body(data) }),
  update:      (shopId, userId, data) => req(`/superadmin/shops/${shopId}/users/${userId}`, { method: "PUT",   ...body(data) }),
  changePass:  (shopId, userId, password) => req(`/superadmin/shops/${shopId}/users/${userId}/password`, { method: "PATCH", ...body({ password }) }),
  toggleBlock: (shopId, userId) => req(`/superadmin/shops/${shopId}/users/${userId}/toggle-block`, { method: "PATCH" }),
  delete:      (shopId, userId) => req(`/superadmin/shops/${shopId}/users/${userId}`,    { method: "DELETE" }),
};

// ── Mijozlar ────────────────────────────────────────────────────
export const customerApi = {
  getAll:  (params = "") => req(`/superadmin/customers${params ? "?" + params : ""}`),
  getById: (id)          => req(`/superadmin/customers/${id}`),
  update:  (id, data)    => req(`/superadmin/customers/${id}`, { method: "PUT", ...body(data) }),
  delete:  (id)          => req(`/superadmin/customers/${id}`, { method: "DELETE" }),
};
