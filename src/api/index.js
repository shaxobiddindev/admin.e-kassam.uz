import { API_BASE as API, LOGIN_URL } from "../config";

// Token expired 403 hisoblagich — 2 marta kelsa logout
let _expiredCount = 0;
let _expiredTimer = null;

async function req(path, options = {}, _retry = false) {
  const token = localStorage.getItem("ek_token");
  const { headers: extra, ...rest } = options;

  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      "Content-Type":    "application/json",
      "Accept-Language": "uz",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra || {}),
    },
  });

  // 401 + X-Token-Expired header — token muddati o'tgan
  if (res.status === 401) {
    const tokenExpired = res.headers.get("X-Token-Expired") === "true";
    if (tokenExpired || _retry) {
      // Admin uchun refresh yo'q — to'g'ridan logout
      localStorage.clear();
      window.location.replace(`${LOGIN_URL}?logged_out=1`);
      return {};
    }
    // Header yo'q, lekin 401 — bir marta qayta tekshir
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
  logout: ()     => req("/auth/logout", { method: "POST" }),
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
  getAll:  ()          => req("/customers"),
  getById: (id)        => req(`/customers/${id}`),
  update:  (id, data)  => req(`/customers/${id}`, { method: "PUT", ...body(data) }),
  delete:  (id)        => req(`/customers/${id}`, { method: "DELETE" }),
};
