import "./styles.css";
/* BUILD_ID: ADMIN_I18N_V1 */
import { useState } from "react";
import { LOGIN_URL } from "./config";
import { initLang, withLang, useT } from "./lib/ek-i18n";
import { useAuth }  from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";

import Toast         from "./components/Toast";
import Layout        from "./components/Layout";
import { ConfirmProvider } from "./context/ConfirmProvider";
import DashboardPage from "./pages/DashboardPage";
import ShopsPage     from "./pages/ShopsPage";
import UsersPage     from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";
import RequestsPage  from "./pages/RequestsPage";
import AuditPage     from "./pages/AuditPage";
import SettingsPage  from "./pages/SettingsPage";

const PAGES = {
  dashboard: DashboardPage,
  requests:  RequestsPage,
  shops:     ShopsPage,
  users:     UsersPage,
  customers: CustomersPage,
  audit:     AuditPage,
  settings:  SettingsPage,
};

// ⚠ Tilni URL dan olish MODUL TANASIDA, `replaceState` dan OLDIN bo'lishi shart.
// Bu fayl `main.jsx` dan import qilinadi va ES modul tartibiga ko'ra shu tana
// `main.jsx` dagi `initLang()` dan OLDIN ishlaydi. Agar avval URL tozalansa,
// `?lang=` yo'qoladi va login'da tanlangan til bu yerga umuman yetib kelmaydi.
initLang();

// ── URL dan auth param olib localStorage ga yozish ──────────
const _urlParams = new URLSearchParams(window.location.search);
const _authParam = _urlParams.get("auth");
if (_authParam) {
  try {
    const _p = new URLSearchParams(decodeURIComponent(_authParam));
    const _token    = _p.get("token")    || "";
    const _type     = _p.get("type")     || "";
    const _username = _p.get("username") || "";
    const _fullName = _p.get("fullName") || _username;
    const _role     = _p.get("role")     || "";
    const _refresh  = _p.get("refresh") || _p.get("refreshToken") || "";
    // Refresh token login domenidagi deviceId ga bog'langan — o'shani
    // saqlaymiz, aks holda bu yerda yangi id yaralib refresh rad etiladi.
    const _deviceId = _p.get("deviceId") || "";

    if (_token && _type) {
      localStorage.setItem("ek_token",    _token);
      localStorage.setItem("ek_refresh",  _refresh);
      if (_deviceId) localStorage.setItem("ek_deviceId", _deviceId);
      localStorage.setItem("ek_type",     _type);
      localStorage.setItem("ek_username", _username);
      localStorage.setItem("ek_fullName", _fullName);
      localStorage.setItem("ek_role",     _role);
    }
  } catch(e) {
    console.error("[ADMIN] auth param xatosi:", e);
  }
  window.history.replaceState({}, "", window.location.pathname);
}

// Token tekshirish
const token = localStorage.getItem("ek_token");
const type  = localStorage.getItem("ek_type");
if (!token || type !== "admin") {
  // Til tanlovi sessiyaga emas, brauzerga tegishli — `clear()` dan omon qolsin,
  // aks holda chiqarilgan foydalanuvchi kirish ekranini yana boshqa tilda ko'radi.
  const _lang = localStorage.getItem("ek_lang");
  localStorage.clear();
  if (_lang) localStorage.setItem("ek_lang", _lang);
  window.location.replace(withLang(`${LOGIN_URL}?logged_out=1`));
}

export default function App() {
  // Yagona til obunasi: til o'zgarganda BUTUN daraxt qayta chiziladi va
  // ichkaridagi barcha `t()` chaqiruvlari yangi tilni oladi.
  useT();
  const { user, logout }           = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [page, setPage]            = useState("dashboard");

  if (!user) return null;

  const PageComponent = PAGES[page] || DashboardPage;

  return (
    <ConfirmProvider>
      <Toast toasts={toasts} onDismiss={dismiss} />
      <Layout page={page} setPage={setPage} user={user} onLogout={logout}>
        <PageComponent toast={toast} setPage={setPage} user={user} onLogout={logout} />
      </Layout>
    </ConfirmProvider>
  );
}
